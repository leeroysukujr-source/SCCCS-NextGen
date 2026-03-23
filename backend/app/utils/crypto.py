import os
import logging
import time
from cryptography.fernet import Fernet, InvalidToken

# Simple in-memory cache for fetched keys to avoid repeated Vault calls
_CACHED_KEY = None
_CACHED_KEY_TS = 0
_CACHE_TTL = 300  # seconds

log = logging.getLogger(__name__)


def _get_fernet():
    key = os.environ.get('TOTP_ENC_KEY')
    if not key:
        # Fallback: check for a key file path in TOTP_ENC_KEY_FILE
        key_file = os.environ.get('TOTP_ENC_KEY_FILE')
        if key_file and os.path.exists(key_file):
            try:
                with open(key_file, 'r') as f:
                    key = f.read().strip()
            except Exception as e:
                log.exception('Failed to read TOTP_ENC_KEY_FILE: %s', e)

    if not key:
        # Try fetching from Vault (KV v1 or v2) if configured.
        # This is a small, non-blocking helper: it will attempt a few retries
        # and parse both KV v1 and KV v2 response shapes.
        vault_addr = os.environ.get('VAULT_ADDR')
        vault_token = os.environ.get('VAULT_TOKEN')
        vault_path = os.environ.get('VAULT_TOTP_KEY_PATH')
        if vault_addr and vault_token and vault_path:
            # Use cached key when fresh
            global _CACHED_KEY, _CACHED_KEY_TS
            if _CACHED_KEY and (time.time() - _CACHED_KEY_TS) < _CACHE_TTL:
                key = _CACHED_KEY
            else:
                possible = None
                # Try hvac client first if available
                try:
                    import hvac
                    client = hvac.Client(url=vault_addr, token=vault_token, verify=(os.environ.get('VAULT_CACERT') or not (os.environ.get('VAULT_SKIP_VERIFY', '0') in ('1','true','True'))))
                    vault_kv_version = os.environ.get('VAULT_KV_VERSION', '2')
                    if vault_kv_version == '2':
                        r = client.secrets.kv.v2.read_secret_version(path=vault_path)
                        data = r.get('data', {}).get('data', {}) if isinstance(r, dict) else {}
                        possible = data.get('key') or data.get('TOTP_ENC_KEY')
                    else:
                        r = client.secrets.kv.v1.read_secret(path=vault_path)
                        data = r.get('data', {}) if isinstance(r, dict) else {}
                        possible = data.get('key') or data.get('TOTP_ENC_KEY')
                except Exception:
                    # hvac not available or failed; fallback to HTTP requests
                    try:
                        import requests
                        headers = {'X-Vault-Token': vault_token}
                        vault_kv_version = os.environ.get('VAULT_KV_VERSION', '2')
                        # Build vault URL for KV v2 or v1
                        if vault_kv_version == '2':
                            parts = vault_path.split('/')
                            if len(parts) >= 2:
                                mount = parts[0]
                                subpath = '/'.join(parts[1:])
                                vault_url = f"{vault_addr.rstrip('/')}/v1/{mount}/data/{subpath}"
                            else:
                                vault_url = f"{vault_addr.rstrip('/')}/v1/{vault_path.rstrip('/')}"
                        else:
                            vault_url = f"{vault_addr.rstrip('/')}/v1/{vault_path.lstrip('/')}"

                        vault_cacert = os.environ.get('VAULT_CACERT')
                        vault_skip_verify = os.environ.get('VAULT_SKIP_VERIFY', '0') in ('1', 'true', 'True')
                        verify = True
                        if vault_cacert:
                            verify = vault_cacert
                        if vault_skip_verify:
                            verify = False

                        for attempt in range(3):
                            try:
                                r = requests.get(vault_url, headers=headers, timeout=6, verify=verify)
                                if r.status_code == 200:
                                    j = r.json()
                                    d = j.get('data') or {}
                                    if isinstance(d, dict) and 'data' in d and isinstance(d['data'], dict):
                                        possible = d['data'].get('key') or d['data'].get('TOTP_ENC_KEY')
                                    if not possible and isinstance(d, dict):
                                        possible = d.get('key') or d.get('TOTP_ENC_KEY')
                                    if not possible:
                                        possible = j.get('key') or j.get('TOTP_ENC_KEY')
                            except Exception:
                                time.sleep(0.5 * (attempt + 1))
                            if possible:
                                break
                    except Exception:
                        log.exception('Failed to fetch key from Vault (requests path)')

                if possible:
                    key = possible
                    _CACHED_KEY = key
                    _CACHED_KEY_TS = time.time()
                else:
                    log.debug('Vault did not return a totp key for path %s', vault_path)

    if not key:
        log.warning('TOTP_ENC_KEY not set; totp_secret will NOT be encrypted')
        return None
    try:
        return Fernet(key)
    except Exception as e:
        log.exception('Invalid TOTP_ENC_KEY: %s', e)
        return None


def encrypt_secret(plaintext: str) -> str:
    if plaintext is None:
        return None
    f = _get_fernet()
    if not f:
        # No key available, return plaintext (no encryption)
        return plaintext
    token = f.encrypt(plaintext.encode('utf-8'))
    return f"enc:{token.decode('utf-8')}"


def decrypt_secret(value: str) -> str:
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    # If not prefixed, assume it's plaintext
    if not value.startswith('enc:'):
        return value
    b64 = value[len('enc:'):]
    f = _get_fernet()
    if not f:
        log.warning('TOTP_ENC_KEY not available; returning encrypted token as-is')
        return value
    try:
        plain = f.decrypt(b64.encode('utf-8'))
        return plain.decode('utf-8')
    except InvalidToken:
        log.exception('Failed to decrypt totp_secret: invalid token')
        return None
    except Exception:
        log.exception('Failed to decrypt totp_secret')
        return None

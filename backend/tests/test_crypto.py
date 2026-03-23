import os
import pytest
from cryptography.fernet import Fernet

# Import the helpers under test
from app.utils import crypto


def test_encrypt_decrypt_roundtrip(monkeypatch):
    # generate a temporary Fernet key
    key = Fernet.generate_key().decode()
    # set env var so crypto._get_fernet will pick it up
    monkeypatch.setenv('TOTP_ENC_KEY', key)

    plaintext = 'my-secret-totp-value'
    token = crypto.encrypt_secret(plaintext)
    assert token is not None
    assert token.startswith('enc:')

    decrypted = crypto.decrypt_secret(token)
    assert decrypted == plaintext


def test_decrypt_without_key_returns_raw(monkeypatch):
    # Ensure no key in env
    monkeypatch.delenv('TOTP_ENC_KEY', raising=False)
    val = 'enc:whatever'
    # When key is not available, decrypt_secret returns the original value (logged)
    res = crypto.decrypt_secret(val)
    assert res == val

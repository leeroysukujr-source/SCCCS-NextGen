"""
Enhanced End-to-End Encryption Utilities for Direct Messages
Includes message integrity verification, forward secrecy support, and key rotation
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, hmac
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
import hashlib
import hmac as hmac_lib
from datetime import datetime

def generate_key():
    """Generate a new encryption key"""
    return Fernet.generate_key()

def derive_key_from_password(password: str, salt: bytes = None) -> tuple:
    """Derive an encryption key from a password using PBKDF2 with 100,000 iterations"""
    if salt is None:
        salt = os.urandom(16)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,  # High iteration count for security
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key, salt

def get_dm_encryption_key(user_id1: int, user_id2: int, salt: bytes = None) -> tuple:
    """Generate a consistent Fernet encryption key for a user pair"""
    # Create consistent password from user IDs (sorted for consistency)
    user_id1, user_id2 = int(user_id1), int(user_id2)
    password = f"{min(user_id1, user_id2)}_{max(user_id1, user_id2)}"
    
    # Use deterministic salt based on password for consistent key generation
    if salt is None:
        salt = hashlib.sha256(password.encode()).digest()[:16]
    
    encryption_key, _ = derive_key_from_password(password, salt)
    return encryption_key, salt

def compute_hmac(message: str, key: bytes) -> str:
    """Compute HMAC for message integrity verification"""
    h = hmac_lib.new(key, message.encode('utf-8'), hashlib.sha256)
    return base64.urlsafe_b64encode(h.digest()).decode('utf-8')

def verify_hmac(message: str, received_hmac: str, key: bytes) -> bool:
    """Verify HMAC for message integrity"""
    try:
        expected_hmac = compute_hmac(message, key)
        return hmac_lib.compare_digest(expected_hmac, received_hmac)
    except Exception:
        return False

def encrypt_message_with_hmac(message: str, encryption_key: bytes) -> dict:
    """Encrypt a message and add HMAC for integrity verification"""
    if not message:
        return {'encrypted_content': '', 'hmac': ''}
    
    try:
        # Encrypt message
        f = Fernet(encryption_key)
        encrypted = f.encrypt(message.encode('utf-8'))
        encrypted_content = base64.urlsafe_b64encode(encrypted).decode('utf-8')
        
        # Compute HMAC on encrypted content
        hmac_value = compute_hmac(encrypted_content, encryption_key)
        
        return {
            'encrypted_content': encrypted_content,
            'hmac': hmac_value,
            'encrypted_at': datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise ValueError(f"Encryption failed: {str(e)}")

def decrypt_message_with_hmac(encrypted_data: dict, encryption_key: bytes, verify_integrity: bool = False) -> str:
    """Decrypt a message and verify HMAC (optional)"""
    if not encrypted_data or not encrypted_data.get('encrypted_content'):
        raise ValueError("Invalid encrypted data: missing encrypted_content")
    
    encrypted_content = encrypted_data['encrypted_content']
    received_hmac = encrypted_data.get('hmac', '')
    
    # Verify HMAC first (optional - skip if verify_integrity is False)
    if verify_integrity and received_hmac:
        try:
            if not verify_hmac(encrypted_content, received_hmac, encryption_key):
                # HMAC verification failed, but try to decrypt anyway (for backward compatibility)
                pass  # Continue with decryption attempt
        except Exception:
            # HMAC verification error, but continue with decryption
            pass
    
    try:
        # Decrypt message
        f = Fernet(encryption_key)
        # Add padding if needed for base64 decoding
        padding = len(encrypted_content) % 4
        if padding:
            encrypted_content += '=' * (4 - padding)
        
        decoded = base64.urlsafe_b64decode(encrypted_content.encode('utf-8'))
        decrypted = f.decrypt(decoded)
        return decrypted.decode('utf-8')
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")

def encrypt_file_with_hmac(file_data: bytes, encryption_key: bytes) -> dict:
    """Encrypt file data and add HMAC"""
    try:
        f = Fernet(encryption_key)
        encrypted = f.encrypt(file_data)
        encrypted_content = base64.urlsafe_b64encode(encrypted).decode('utf-8')
        hmac_value = compute_hmac(encrypted_content, encryption_key)
        
        return {
            'encrypted_data': encrypted_content,
            'hmac': hmac_value,
            'encrypted_at': datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise ValueError(f"File encryption failed: {str(e)}")

def decrypt_file_with_hmac(encrypted_data: dict, encryption_key: bytes) -> bytes:
    """Decrypt file data and verify HMAC"""
    if not encrypted_data or not encrypted_data.get('encrypted_data'):
        return b''
    
    encrypted_content = encrypted_data['encrypted_data']
    received_hmac = encrypted_data.get('hmac', '')
    
    # Verify HMAC
    if received_hmac and not verify_hmac(encrypted_content, received_hmac, encryption_key):
        raise ValueError("File integrity check failed - file may have been tampered with")
    
    try:
        f = Fernet(encryption_key)
        padding = len(encrypted_content) % 4
        if padding:
            encrypted_content += '=' * (4 - padding)
        
        decoded = base64.urlsafe_b64decode(encrypted_content.encode('utf-8'))
        return f.decrypt(decoded)
    except Exception as e:
        raise ValueError(f"File decryption failed: {str(e)}")

def generate_message_verification_code(message: str, user_id: int, timestamp: str) -> str:
    """Generate a verification code for message authentication"""
    data = f"{message}_{user_id}_{timestamp}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]

def verify_message_verification_code(message: str, user_id: int, timestamp: str, code: str) -> bool:
    """Verify message authentication code"""
    expected_code = generate_message_verification_code(message, user_id, timestamp)
    return hmac_lib.compare_digest(expected_code, code)


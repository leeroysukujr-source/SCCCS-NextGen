"""
End-to-end encryption utilities for messages and files
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
import traceback

def generate_key():
    """Generate a new encryption key"""
    return Fernet.generate_key()

def derive_key_from_password(password: str, salt: bytes = None) -> bytes:
    """Derive an encryption key from a password using PBKDF2"""
    if salt is None:
        salt = os.urandom(16)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key, salt

def encrypt_message(message: str, key: bytes) -> str:
    """Encrypt a message using Fernet symmetric encryption"""
    if not message:
        return message
    
    try:
        f = Fernet(key)
        # Encrypt returns bytes (base64 encoded token)
        encrypted_bytes = f.encrypt(message.encode('utf-8'))
        # We double encode it to ensure string safety in all DBs/Transports (Legacy behavior preservation)
        return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')
    except Exception as e:
        print(f"Encryption error: {e}")
        return message

def decrypt_message(encrypted_message: str, key: bytes) -> str:
    """Decrypt a message using Fernet symmetric encryption"""
    if not encrypted_message:
        return encrypted_message
    
    # Check if content looks like it might not be encrypted
    if len(encrypted_message) < 20:
        raise ValueError("Content too short to be encrypted")
    
    try:
        f = Fernet(key)
        
        # Case 1: Standard Fernet Token (starts with gAAAA)
        # This occurs if message wasn't double-encoded
        if encrypted_message.startswith('gAAAA'):
            return f.decrypt(encrypted_message.encode('utf-8')).decode('utf-8')
            
        # Case 2: Double Encoded (starts with Z0FB - base64 of gAAAA)
        # This is our current standard behavior
        try:
            # Fix padding
            padding = len(encrypted_message) % 4
            if padding:
                encrypted_message += '=' * (4 - padding)
            
            # First decode: get the Fernet Token bytes
            decoded_token = base64.urlsafe_b64decode(encrypted_message.encode('utf-8'))
            
            # Now decrypt the token
            # Note: f.decrypt accepts bytes, and decoded_token IS the token bytes (e.g. b'gAAAA...')
            decrypted = f.decrypt(decoded_token)
            return decrypted.decode('utf-8')
        except Exception as e:
            # If Double Decode failed, maybe it's some other format or corrupt
            # Try decrypting raw just in case it was a raw bytes token passed as string? Unlikely.
            raise e

    except (ValueError, TypeError, Exception) as e:
        # print(f"Decryption error: {e}") # Debugging
        raise
        
def encrypt_file_data(file_data: bytes, key: bytes) -> bytes:
    """Encrypt file data"""
    try:
        f = Fernet(key)
        return f.encrypt(file_data)
    except Exception:
        return file_data

def decrypt_file_data(encrypted_data: bytes, key: bytes) -> bytes:
    """Decrypt file data"""
    try:
        f = Fernet(key)
        return f.decrypt(encrypted_data)
    except Exception:
        return encrypted_data

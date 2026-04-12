from cryptography.fernet import Fernet
import base64
import os
from flask import current_app

class EncryptionService:
    @staticmethod
    def get_key():
        key = current_app.config.get('ENCRYPTION_KEY')
        if not key:
            # Fallback to a derived key from SECRET_KEY if ENCRYPTION_KEY is missing
            # In production, ENCRYPTION_KEY MUST be a valid Fernet key
            secret = current_app.config.get('SECRET_KEY', 'default-secret-key')
            key = base64.urlsafe_b64encode(secret.ljust(32)[:32].encode())
        return key

    @classmethod
    def encrypt(cls, data, key=None):
        if not data:
            return None
        
        # Use provided key or fallback to system key
        enc_key = key if key else cls.get_key()
        
        # Ensure data is bytes for Fernet
        if isinstance(data, str):
            data = data.encode()
            
        f = Fernet(enc_key)
        encrypted = f.encrypt(data)
        
        # Return as string if input was string, else bytes
        return encrypted.decode() if isinstance(data, bytes) and not isinstance(encrypted, bytes) else encrypted

    @classmethod
    def decrypt(cls, encrypted_data, key=None):
        if not encrypted_data:
            return None
        try:
            # Use provided key or fallback to system key
            enc_key = key if key else cls.get_key()
            
            # Ensure encrypted_data is bytes for Fernet
            if isinstance(encrypted_data, str):
                encrypted_data = encrypted_data.encode()
                
            f = Fernet(enc_key)
            decrypted = f.decrypt(encrypted_data)
            
            # Try to return as string, fallback to bytes for binary files
            try:
                return decrypted.decode()
            except UnicodeDecodeError:
                return decrypted
        except Exception:
            return "[Decryption Error]"

def generate_key():
    """Generate a new Fernet key for channel encryption"""
    return Fernet.generate_key()

def encrypt(data, key=None):
    """Top-level helper for encryption"""
    return EncryptionService.encrypt(data, key)

def decrypt(data, key=None):
    """Top-level helper for decryption"""
    return EncryptionService.decrypt(data, key)

# Aliases for different route requirements
encrypt_message = encrypt
decrypt_message = decrypt
encrypt_file_data = encrypt
decrypt_file_data = decrypt

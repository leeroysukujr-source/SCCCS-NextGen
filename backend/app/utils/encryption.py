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
    def encrypt(cls, data):
        if not data:
            return None
        f = Fernet(cls.get_key())
        return f.encrypt(data.encode()).decode()

    @classmethod
    def decrypt(cls, encrypted_data):
        if not encrypted_data:
            return None
        try:
            f = Fernet(cls.get_key())
            return f.decrypt(encrypted_data.encode()).decode()
        except Exception:
            return "[Decryption Error]"

def generate_key():
    """Generate a new Fernet key for channel encryption"""
    return Fernet.generate_key()

def encrypt(data):
    """Top-level helper for encryption"""
    return EncryptionService.encrypt(data)

def decrypt(data):
    """Top-level helper for decryption"""
    return EncryptionService.decrypt(data)

# Aliases for different route requirements
encrypt_message = encrypt
decrypt_message = decrypt

"""
Debug utility to test decryption of direct messages
Run this to debug why messages aren't decrypting properly
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import create_app, db
from config import Config
from app.models import DirectMessage
from app.utils.e2e_encryption import get_dm_encryption_key, decrypt_message_with_hmac
from app.utils.encryption import decrypt_message
import json
import base64
import hashlib

def debug_message_decryption(message_id):
    """Debug why a message isn't decrypting"""
    app = create_app(Config)
    with app.app_context():
        message = DirectMessage.query.get(message_id)
        if not message:
            print(f"Message {message_id} not found")
            return
        
        print(f"\n=== Debugging Message {message_id} ===")
        print(f"Sender ID: {message.sender_id}")
        print(f"Recipient ID: {message.recipient_id}")
        print(f"Is Encrypted: {message.is_encrypted}")
        print(f"Content Length: {len(message.content) if message.content else 0}")
        print(f"Content Preview: {message.content[:100] if message.content else 'None'}...")
        print(f"Content Type: {type(message.content)}")
        
        if not message.content or message.content == '[File]':
            print("Message has no content or is a file")
            return
        
        # Try to parse as JSON
        try:
            data = json.loads(message.content)
            print(f"✓ Content is valid JSON")
            print(f"JSON Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            if isinstance(data, dict):
                print(f"Has encrypted_content: {'encrypted_content' in data}")
                print(f"Has hmac: {'hmac' in data}")
        except json.JSONDecodeError:
            print("✗ Content is NOT JSON (plain encrypted string)")
        
        # Try decryption with all methods
        encryption_key, _ = get_dm_encryption_key(message.sender_id, message.recipient_id)
        print(f"\nEncryption Key Type: {type(encryption_key)}")
        print(f"Encryption Key Length: {len(encryption_key) if encryption_key else 0}")
        
        # Method 1: HMAC format
        print("\n--- Method 1: HMAC Format ---")
        try:
            encrypted_data = json.loads(message.content)
            decrypted = decrypt_message_with_hmac(encrypted_data, encryption_key, verify_integrity=False)
            print(f"✓ Decrypted: {decrypted[:50]}...")
            return decrypted
        except Exception as e:
            print(f"✗ Failed: {str(e)}")
        
        # Method 2: Simple encrypted format
        print("\n--- Method 2: Simple Encrypted Format ---")
        try:
            from app.utils.encryption import decrypt_message
            decrypted = decrypt_message(message.content, encryption_key)
            print(f"✓ Decrypted: {decrypted[:50]}...")
            return decrypted
        except Exception as e:
            print(f"✗ Failed: {str(e)}")
        
        # Method 3: Old key method
        print("\n--- Method 3: Old Key Method ---")
        try:
            from app.utils.encryption import decrypt_message
            from app.routes.direct_messages import get_dm_encryption_key as get_old_key
            old_key = get_old_key(message.sender_id, message.recipient_id)
            decrypted = decrypt_message(message.content, old_key)
            print(f"✓ Decrypted: {decrypted[:50]}...")
            return decrypted
        except Exception as e:
            print(f"✗ Failed: {str(e)}")
        
        # Method 4: Legacy method
        print("\n--- Method 4: Legacy Method ---")
        try:
            from app.utils.encryption import decrypt_message
            old_key_raw = f"{message.sender_id}_{message.recipient_id}".encode('utf-8')
            old_key_32 = hashlib.sha256(old_key_raw).digest()
            old_key_b64 = base64.urlsafe_b64encode(old_key_32)
            decrypted = decrypt_message(message.content, old_key_b64)
            print(f"✓ Decrypted: {decrypted[:50]}...")
            return decrypted
        except Exception as e:
            print(f"✗ Failed: {str(e)}")
        
        print("\n✗ All decryption methods failed")
        return None

if __name__ == '__main__':
    if len(sys.argv) > 1:
        message_id = int(sys.argv[1])
        debug_message_decryption(message_id)
    else:
        print("Usage: python debug_decrypt.py <message_id>")


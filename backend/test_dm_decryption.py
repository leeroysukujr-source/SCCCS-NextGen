"""
Test script to check if direct message decryption is working
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

# This will help us see what's in the database
from app import create_app, db
from config import Config
from app.models import DirectMessage, User

def check_messages():
    app = create_app(Config)
    with app.app_context():
        messages = DirectMessage.query.limit(5).all()
        print(f"Found {len(messages)} messages to check")
        
        for msg in messages:
            print(f"\n--- Message ID: {msg.id} ---")
            print(f"Sender: {msg.sender_id}, Recipient: {msg.recipient_id}")
            print(f"Is Encrypted: {msg.is_encrypted}")
            print(f"Content Length: {len(msg.content) if msg.content else 0}")
            print(f"Content Preview (first 150 chars): {msg.content[:150] if msg.content else 'None'}")
            print(f"Starts with {{: {msg.content.startswith('{') if msg.content else False}")
            print(f"Is JSON-like: {msg.content and (msg.content.startswith('{') or msg.content.startswith('['))}")

if __name__ == '__main__':
    check_messages()


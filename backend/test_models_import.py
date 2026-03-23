"""
Test script to verify models can be imported correctly
Run this to check if the import structure is working before running the full app
"""
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("Testing model imports...")

try:
    # Test importing from app.models
    from app.models import User, Message, Channel, ChannelMember
    print("✓ Successfully imported User, Message, Channel, ChannelMember from app.models")
except ImportError as e:
    print(f"✗ Failed to import main models: {e}")
    sys.exit(1)

try:
    # Test importing chat feature models
    from app.models.chat_features import MessageReaction, ChannelPoll
    print("✓ Successfully imported MessageReaction, ChannelPoll from app.models.chat_features")
except ImportError as e:
    print(f"✗ Failed to import chat feature models: {e}")
    sys.exit(1)

try:
    # Test that models can also be imported through the package
    from app.models import MessageReaction
    print("✓ Successfully imported MessageReaction through app.models package")
except ImportError as e:
    print(f"✗ Failed to import through package: {e}")
    sys.exit(1)

print("\n✅ All model imports working correctly!")
print("The import structure is fixed. You can now run the app with:")
print("  python run.py")


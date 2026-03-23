# Message Preview Fix

## Issue Fixed
Message previews in the direct messages conversation list were showing `[Message]` instead of actual message content.

## Root Cause
1. Decryption was failing silently in some cases
2. Multiple decryption methods weren't being tried systematically
3. Preview formatting was happening twice

## Solution Applied

### 1. Enhanced Decryption Logic
- Added support for new HMAC-based encryption format (JSON)
- Tries multiple decryption methods in order:
  1. New HMAC-based format (JSON with encrypted_content and hmac)
  2. New simple encrypted format
  3. Old key method
  4. Legacy method
  
### 2. Improved Preview Formatting
- Enhanced `format_message_preview()` function to better detect encrypted vs plain text
- Removed duplicate formatting calls
- Better handling of edge cases

### 3. Better Error Handling
- More robust exception handling
- Fallback to multiple decryption methods
- Clearer error states

## Files Modified
- `backend/app/routes/direct_messages.py` - Enhanced decryption logic and preview formatting

## Testing
1. Send a direct message
2. Check conversation list - should show actual message preview
3. Preview should be truncated if too long (max 100 chars)
4. Should handle encrypted messages correctly


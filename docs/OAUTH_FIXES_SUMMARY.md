# OAuth & Database Fixes Summary

## Issues Fixed

### 1. Database Schema Issue ✅ FIXED
**Problem:** `channel_members` table was missing the `role` column, causing errors when creating channels.

**Solution:** Added the `role` column to the `channel_members` table with default value 'member'. Existing records were updated appropriately.

**Status:** ✅ Fixed - You can now create channels without errors.

### 2. Google OAuth Login Issues ✅ IMPROVED
**Problems:**
- Timeout errors during OAuth flow
- Redirect URI mismatches
- Connection issues between frontend and backend

**Solutions Applied:**
1. **Dynamic Redirect URI Handling:**
   - Frontend now sends its origin (`window.location.origin`) to backend
   - Backend uses this to match the redirect URI exactly
   - Works for users accessing from different locations (localhost, network IPs, different domains)

2. **Request Timeouts:**
   - Added 10-second timeouts to all Google OAuth API requests
   - Increased frontend timeout to 30 seconds
   - Prevents hanging requests

3. **Better Error Handling:**
   - Clear error messages for different failure scenarios
   - Detailed logging for debugging
   - Specific handling for timeout vs connection errors

4. **API Client Improvements:**
   - Fixed URL detection to use `localhost:5000` when accessed from `localhost:5173`
   - Better fallback logic for network access

## Google Cloud Console Setup (REQUIRED)

For Google OAuth to work, you **MUST** register all possible redirect URIs in Google Cloud Console:

### Steps:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173/auth/callback`
   - `http://192.168.1.65:5173/auth/callback` (your network IP)
   - Any other origins users might access from

### Important Notes:
- The redirect URI must match **exactly** (including http/https, port, and path)
- You can add multiple redirect URIs
- Changes may take a few minutes to propagate

## Testing OAuth Login

1. **Check Backend is Running:**
   ```bash
   # Backend should be running on port 5000
   netstat -ano | findstr :5000
   ```

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Look for `[API Client]` messages
   - Check for any error messages

3. **Check Backend Logs:**
   - Look for `Google OAuth callback` messages
   - Check for redirect URI being used
   - Look for any error messages from Google

4. **Try Login:**
   - Click "Sign in with Google"
   - Complete Google authentication
   - Should redirect back and log you in

## Common Issues & Solutions

### Issue: "Cannot connect to the server"
**Solution:** 
- Make sure backend is running: `cd backend && python run.py`
- Check if port 5000 is accessible
- Verify API client is using correct URL (check browser console)

### Issue: "redirect_uri_mismatch"
**Solution:**
- Check Google Cloud Console has the exact redirect URI registered
- Verify the redirect URI in backend logs matches what's in Google Cloud Console
- Make sure you're using `http://` not `https://` for localhost

### Issue: "Request timed out"
**Solution:**
- Check internet connection
- Verify Google OAuth credentials are correct in `.env`
- Check backend logs for detailed error messages

### Issue: "Failed to exchange token"
**Solution:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `backend/.env`
- Check redirect URI matches exactly
- Look at backend logs for Google's error response

## Multi-User Support

The system now supports:
- ✅ Users from different locations (localhost, network IPs, different domains)
- ✅ Multiple concurrent OAuth flows
- ✅ Different browsers and devices
- ✅ Dynamic redirect URI detection

Each user's OAuth flow uses their own origin, ensuring it works regardless of where they access from.

## Next Steps

1. **Verify Google Cloud Console Setup:**
   - Ensure all redirect URIs are registered
   - Verify OAuth credentials are correct

2. **Test OAuth Login:**
   - Try logging in with Google
   - Check browser console for errors
   - Check backend logs for detailed information

3. **If Still Having Issues:**
   - Share the exact error message
   - Share backend log output
   - Share browser console errors

## Files Modified

- `backend/app/models.py` - Fixed GroupJoinRequest relationship
- `backend/app/routes/auth.py` - Improved OAuth handling, timeouts, error messages
- `backend/config.py` - Updated default redirect URI
- `frontend/src/api/client.js` - Fixed URL detection
- `frontend/src/pages/OAuthCallback.jsx` - Improved error handling
- `frontend/src/api/auth.js` - Added redirect_uri parameter
- Database: Added `role` column to `channel_members` table
- Database: Added `privileges` column to `users` table


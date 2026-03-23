# Quick Fix for Google OAuth Setup

## Current Issue

You're seeing errors in Google Cloud Console because:
1. **Authorized JavaScript origins** cannot have paths (like `/auth/callback`)
2. **Authorized JavaScript origins** cannot use local IP addresses (like `192.168.1.65`)

## Immediate Fix Steps

### Step 1: Fix Authorized JavaScript Origins

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Click on your OAuth 2.0 Client ID
4. In the **"Authorized JavaScript origins"** section:
   - **REMOVE** `http://192.168.1.65:5173/auth/callback` (has a path - not allowed)
   - **ADD** `http://localhost:5173` (no path, just the origin)
   - ⚠️ **DO NOT** add `http://192.168.1.65:5173` here (local IPs not allowed by Google)

### Step 2: Fix Authorized Redirect URIs

In the **"Authorized redirect URIs"** section:
- **KEEP** `http://localhost:5173/auth/callback` (this is correct)
- **ADD** `http://192.168.1.65:5173/auth/callback` (if you need network access)
- ✅ These CAN have paths and local IPs

### Step 3: Save Changes

Click **"Save"** at the bottom of the page.

## Summary

**Authorized JavaScript origins** (what to put here):
- ✅ `http://localhost:5173`
- ❌ `http://192.168.1.65:5173` (local IPs not allowed)
- ❌ `http://localhost:5173/auth/callback` (paths not allowed)

**Authorized redirect URIs** (what to put here):
- ✅ `http://localhost:5173/auth/callback`
- ✅ `http://192.168.1.65:5173/auth/callback`
- ✅ These can have paths and local IPs

## After Fixing

1. Make sure your `backend/.env` has the correct credentials
2. Restart your backend server
3. Try logging in with Google again

For detailed instructions, see `OAUTH_SETUP.md`.


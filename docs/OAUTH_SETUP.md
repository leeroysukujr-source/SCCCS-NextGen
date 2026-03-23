# OAuth Setup Guide - Step by Step

This guide provides detailed, step-by-step instructions for setting up Google and GitHub OAuth authentication.

## ⚠️ Important Concepts First

Before you start, understand these two fields:

1. **Authorized JavaScript origins** (for browser-based requests)
   - ✅ Must be just the origin: `http://localhost:5173` or `http://yourdomain.com`
   - ❌ NO paths allowed (no `/auth/callback`)
   - ❌ NO local IP addresses like `192.168.1.65` (Google doesn't allow this)
   - ✅ Use `localhost` for local development

2. **Authorized redirect URIs** (where OAuth sends users after login)
   - ✅ Must include the full path: `http://localhost:5173/auth/callback`
   - ✅ Can use localhost or your domain
   - ✅ Can use local IP addresses (like `192.168.1.65:5173/auth/callback`)

---

## Step 1: Set Up Google OAuth

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click **"New Project"**
4. Enter project name: `SCCCS NextGen` (or any name)
5. Click **"Create"**
6. Wait for the project to be created, then select it from the dropdown

### 1.2 Enable Google+ API

1. In the left sidebar, go to **"APIs & Services"** > **"Library"**
2. In the search bar, type: `Google+ API`
3. Click on **"Google+ API"** in the results
4. Click the blue **"Enable"** button
5. Wait for it to enable (you'll see a checkmark)

### 1.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: `SCCCS NextGen`
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On "Scopes" page, click **"Save and Continue"** (no changes needed)
7. On "Test users" page, click **"Save and Continue"** (no changes needed)
8. On "Summary" page, click **"Back to Dashboard"**

### 1.4 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth client ID"**
4. If prompted, select **"Web application"** as the application type
5. Fill in the form:

   **Name**: `SCCCS NextGen Web Client` (or any name)

   **Authorized JavaScript origins** (Click "+ Add URI" for each):
   - `http://localhost:5173`
   - ⚠️ **DO NOT** add `http://192.168.1.65:5173` here (Google doesn't allow local IPs)
   - ⚠️ **DO NOT** include `/auth/callback` in this field

   **Authorized redirect URIs** (Click "+ Add URI" for each):
   - `http://localhost:5173/auth/callback`
   - `http://192.168.1.65:5173/auth/callback` (if you're accessing from another device on your network)
   - ✅ These CAN include paths and local IPs

6. Click **"Create"**
7. **IMPORTANT**: A popup will appear with your credentials:
   - **Client ID**: Copy this (looks like: `123456789-abcdefg.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like: `GOCSPX-abcdefghijklmnop`)
   - ⚠️ **Save these immediately** - you won't see the secret again!

### 1.5 Save Your Credentials

Copy the Client ID and Client Secret to a safe place (you'll add them to your `.env` file next).

---

## Step 2: Set Up GitHub OAuth

### 2.1 Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"** button (top right)

### 2.2 Fill in Application Details

Fill in the form:

- **Application name**: `SCCCS NextGen` (or any name)
- **Homepage URL**: `http://192.168.1.65:5173` (or `http://localhost:5173` for local only)
- **Authorization callback URL**: `http://192.168.1.65:5173/auth/callback`
  - ✅ GitHub allows local IP addresses, so you can use `192.168.1.65:5173`
  - ✅ Or use `http://localhost:5173/auth/callback` if only testing locally

### 2.3 Register and Get Credentials

1. Click **"Register application"**
2. You'll see your **Client ID** (a long string of numbers and letters)
3. Click **"Generate a new client secret"**
4. **IMPORTANT**: Copy the **Client Secret** immediately - you won't see it again!
5. Save both Client ID and Client Secret

---

## Step 3: Configure Backend

### 3.1 Create or Edit `.env` File

1. Navigate to the `backend` folder
2. Create a file named `.env` (if it doesn't exist)
3. Open it in a text editor
4. Add or update these lines:

```env
# OAuth Configuration - Google
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# OAuth Configuration - GitHub
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Frontend URL (update if your frontend runs on different IP/port)
FRONTEND_URL=http://192.168.1.65:5173
OAUTH_REDIRECT_URI=http://192.168.1.65:5173/auth/callback
```

5. **Replace the placeholder values**:
   - Replace `your_google_client_id_here` with your actual Google Client ID
   - Replace `your_google_client_secret_here` with your actual Google Client Secret
   - Replace `your_github_client_id_here` with your actual GitHub Client ID
   - Replace `your_github_client_secret_here` with your actual GitHub Client Secret

6. **Important**: 
   - No quotes around the values
   - No spaces before or after the `=` sign
   - Make sure there are no extra spaces

**Example of correct format:**
```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GITHUB_CLIENT_ID=abc123def456ghi789
GITHUB_CLIENT_SECRET=def789ghi012jkl345mno678pqr901stu234
FRONTEND_URL=http://192.168.1.65:5173
OAUTH_REDIRECT_URI=http://192.168.1.65:5173/auth/callback
```

### 3.2 Install OAuth Library

Open a terminal in the `backend` folder and run:

```bash
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
pip install authlib

# Windows CMD:
venv\Scripts\activate
pip install authlib

# Linux/macOS:
source venv/bin/activate
pip install authlib
```

### 3.3 Restart Backend Server

1. Stop your backend server (press `Ctrl+C` in the terminal where it's running)
2. Start it again:
   ```bash
   python run.py
   ```

---

## Step 4: Test OAuth

### 4.1 Start Your Servers

Make sure both backend and frontend are running:

**Terminal 1 - Backend:**
```bash
cd backend
.\venv\Scripts\Activate.ps1  # Windows
python run.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4.2 Test Google OAuth

1. Open your browser: `http://192.168.1.65:5173` (or `http://localhost:5173`)
2. Go to the **Login** or **Signup** page
3. Click **"Continue with Google"** button
4. You should be redirected to Google's login page
5. Sign in with your Google account
6. You'll be redirected back to your app and logged in

### 4.3 Test GitHub OAuth

1. On the Login or Signup page
2. Click **"Continue with GitHub"** button
3. You should be redirected to GitHub's authorization page
4. Click **"Authorize"** (if prompted)
5. You'll be redirected back to your app and logged in

---

## Troubleshooting

### ❌ "OAuth not configured" error

**Problem**: Backend can't find OAuth credentials.

**Solution**:
1. Check that `backend/.env` file exists
2. Verify all 4 OAuth variables are set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
3. Make sure there are no typos in variable names
4. Make sure there are no quotes around values
5. Restart the backend server after editing `.env`

### ❌ "Redirect URI mismatch" error

**Problem**: The redirect URI in your OAuth app doesn't match what the backend is sending.

**Solution**:
1. **For Google**: 
   - Go to Google Cloud Console > Credentials > Your OAuth Client
   - Check **"Authorized redirect URIs"** section
   - Make sure `http://192.168.1.65:5173/auth/callback` (or `http://localhost:5173/auth/callback`) is listed
   - The URI must match **exactly** (including `http://` vs `https://`)

2. **For GitHub**:
   - Go to GitHub Settings > Developer settings > OAuth Apps > Your App
   - Check **"Authorization callback URL"**
   - Make sure it matches: `http://192.168.1.65:5173/auth/callback`

3. **Backend `.env` file**:
   - Make sure `OAUTH_REDIRECT_URI` in `backend/.env` matches what's in your OAuth app settings

### ❌ "Invalid Origin" error in Google Cloud Console

**Problem**: You're trying to add a local IP address or a path to "Authorized JavaScript origins".

**Solution**:
- **Authorized JavaScript origins** should only contain:
  - `http://localhost:5173` (for local development)
  - `https://yourdomain.com` (for production)
- **DO NOT** add:
  - `http://192.168.1.65:5173` (local IPs not allowed)
  - `http://localhost:5173/auth/callback` (paths not allowed)

### ❌ "Invalid credentials" error

**Problem**: Client ID or Client Secret is incorrect.

**Solution**:
1. Double-check you copied the credentials correctly
2. Make sure there are no extra spaces in your `.env` file
3. Make sure you're using the correct credentials (Google vs GitHub)
4. For Google: Make sure you copied the Client Secret from the popup (you can't see it again after closing)

### ❌ OAuth button does nothing / No redirect

**Problem**: Frontend can't reach the backend OAuth endpoint.

**Solution**:
1. Check backend is running: `http://192.168.1.65:5000/api/auth/test` should return `{"status": "ok"}`
2. Check browser console (F12) for errors
3. Verify `FRONTEND_URL` in `backend/.env` matches your frontend URL
4. Check CORS is configured correctly in backend

### ❌ "Access blocked: This app's request is invalid"

**Problem**: OAuth consent screen is not properly configured or app is in testing mode.

**Solution**:
1. Go to Google Cloud Console > APIs & Services > OAuth consent screen
2. Make sure you've completed all steps (especially adding test users if app is in testing mode)
3. If in testing mode, add your Google account as a test user
4. For production, you'll need to verify your app with Google

---

## Exact Redirect URIs to Register

When adding redirect URIs in Google Cloud Console, make sure you register the exact URL your app will send to Google. Common local development values to add are:

- `http://localhost:5173/auth/callback`
- `http://127.0.0.1:5173/auth/callback`
- `http://<YOUR_LOCAL_IP>:5173/auth/callback` (replace `<YOUR_LOCAL_IP>` with your machine IP e.g. `http://192.168.1.65:5173/auth/callback`)
- If your frontend uses a different port (e.g., Vite default 5173 vs CRA 3000), add that port too: `http://localhost:3000/auth/callback`
- For production, register your HTTPS URL: `https://your-production-domain.com/auth/callback`

Notes:
- The redirect URI must match exactly including scheme (`http` vs `https`), host, port and path.
- For local testing from other devices on the LAN, use your machine's local IP address (e.g., `192.168.1.65`).
- Do not add paths under "Authorized JavaScript origins" — those should only contain origins like `http://localhost:5173`.

## Quick Reference Checklist

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] Google OAuth client created with:
  - [ ] Authorized JavaScript origins: `http://localhost:5173` (no path, no local IP)
  - [ ] Authorized redirect URIs: `http://localhost:5173/auth/callback` and `http://192.168.1.65:5173/auth/callback`
- [ ] Google Client ID and Secret copied
- [ ] GitHub OAuth app created with:
  - [ ] Homepage URL: `http://192.168.1.65:5173`
  - [ ] Callback URL: `http://192.168.1.65:5173/auth/callback`
- [ ] GitHub Client ID and Secret copied
- [ ] `backend/.env` file created/updated with all 4 OAuth credentials
- [ ] `authlib` package installed in backend
- [ ] Backend server restarted
- [ ] Tested Google OAuth login
- [ ] Tested GitHub OAuth login

---

## Security Notes

- ⚠️ **Never commit your `.env` file** to version control (it should be in `.gitignore`)
- ⚠️ Use different OAuth apps for development and production
- ⚠️ Regularly rotate your OAuth secrets (especially if exposed)
- ⚠️ Use HTTPS in production (OAuth requires HTTPS for production)
- ⚠️ Keep your Client Secrets secure - treat them like passwords

---

## Need Help?

If you're still having issues:

1. Check the browser console (F12) for error messages
2. Check the backend terminal for error logs
3. Verify all URLs match exactly (including `http://` vs `https://`)
4. Make sure you restarted the backend after editing `.env`
5. Try using `localhost` instead of `192.168.1.65` if you're only testing locally

# Quick Fix for Backend Connection

## The Problem
The frontend is trying to connect to `192.168.1.65:5000` but the backend is only accessible on `localhost:5000`.

## The Solution (Already Applied)
The code now **always uses `localhost:5000` first** regardless of how you access the frontend.

## Why This Works
- When you access the frontend via `http://192.168.1.65:5173`, the browser is still running on YOUR computer
- The browser can access `localhost:5000` even when you access the frontend via network IP
- The backend runs on `0.0.0.0` which makes it accessible on all network interfaces, including localhost

## To Verify It's Working:

1. **Check if backend is running:**
   ```bash
   cd backend
   python run.py
   ```
   You should see: `Running on http://0.0.0.0:5000`

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access via localhost:**
   - Open: `http://localhost:5173`
   - Should connect to `http://localhost:5000` ✅

4. **Or access via network IP:**
   - Open: `http://192.168.1.65:5173`
   - Will still connect to `http://localhost:5000` ✅

## If Still Not Working:

1. **Make sure backend is running:**
   - Check Task Manager for Python processes
   - Or run `python run.py` in the backend folder

2. **Check firewall:**
   - Windows Firewall might be blocking port 5000
   - Allow Python through firewall if needed

3. **Clear browser cache:**
   - Press `Ctrl + Shift + R` to hard refresh
   - Or open DevTools (F12) and clear cache

4. **Check browser console:**
   - Press F12
   - Look for errors in Console tab
   - Check Network tab to see what URL it's trying

## Default Behavior Now:
- **Always tries `localhost:5000` first**
- Falls back to `192.168.1.65:5000` if localhost doesn't work
- Shows clear error message if neither works


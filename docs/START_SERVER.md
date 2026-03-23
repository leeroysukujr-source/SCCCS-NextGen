# 🚀 How to Start the Server

## Error You're Seeing
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
```

This means the **backend server is not running**. The frontend is trying to connect to `http://localhost:5000` but nothing is listening on that port.

## ✅ Solution: Start the Backend Server

### Option 1: Using Command Line (Recommended)

1. **Open a new terminal/command prompt**
2. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

3. **Activate virtual environment** (if you have one):
   ```bash
   # On Windows:
   venv\Scripts\activate
   
   # On Mac/Linux:
   source venv/bin/activate
   ```

4. **Install dependencies** (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the server:**
   ```bash
   python run.py
   ```

6. **You should see:**
   ```
   * Running on http://0.0.0.0:5000
   * Serving Flask app 'app'
   * Debug mode: on
   ```

### Option 2: Using the Batch File (Windows)

1. **Double-click** `backend/start_backend.bat`

OR

2. **Run from command prompt:**
   ```bash
   cd backend
   start_backend.bat
   ```

### Option 3: Using PowerShell (Windows)

```powershell
cd backend
python run.py
```

## 🔍 Verify Server is Running

Once started, you should see:
- ✅ Server logs in the terminal
- ✅ No errors about missing modules
- ✅ Server listening on port 5000

**Test the connection:**
- Open browser: http://localhost:5000/api/auth/test
- Should return: `{"status": "success", "message": "API is working"}`

## 📋 Complete Startup Sequence

### Terminal 1 - Backend Server
```bash
cd backend
python run.py
```
**Leave this terminal open!** The server needs to keep running.

### Terminal 2 - Frontend (if not already running)
```bash
cd frontend
npm run dev
```

### Terminal 3 - Mediasoup (optional, for video meetings)
```bash
cd mediasoup-server
npm start
```

## ❌ Common Issues

### Issue 1: Port 5000 Already in Use
**Error:** `Address already in use` or `Port 5000 is already in use`

**Solution:**
- Find what's using port 5000 and close it, OR
- Change the port in `backend/config.py`:
  ```python
  SERVER_PORT = 5001  # Change from 5000 to 5001
  ```
- Then update frontend API URL in `frontend/src/utils/api.js`

### Issue 2: Module Not Found
**Error:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
cd backend
pip install -r requirements.txt
```

### Issue 3: Database Error
**Error:** `SQLite database file not found` or database errors

**Solution:**
1. Make sure database exists: `backend/instance/scccs.db`
2. If not, run migrations:
   ```bash
   cd backend
   python migrate_new_tables.py
   ```

### Issue 4: Virtual Environment Not Activated
**Error:** Python packages not found

**Solution:**
```bash
cd backend
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

## 🎯 Quick Fix Steps

1. ✅ **Stop any existing server** (Ctrl+C in terminal)
2. ✅ **Navigate to backend folder**
3. ✅ **Run:** `python run.py`
4. ✅ **Wait for:** "Running on http://0.0.0.0:5000"
5. ✅ **Refresh frontend** in browser
6. ✅ **Try login again**

## 📝 Server Configuration

The server configuration is in `backend/config.py`:
- **Host:** `0.0.0.0` (listens on all interfaces)
- **Port:** `5000` (default)
- **Debug:** `True` (shows detailed errors)

You can change these in `config.py` if needed.

## 🔧 Troubleshooting

### Check if Server is Running
```bash
# Windows:
netstat -ano | findstr :5000

# Mac/Linux:
lsof -i :5000
```

### Kill Process on Port 5000 (if needed)
```bash
# Windows (replace PID with actual process ID):
taskkill /PID <PID> /F

# Mac/Linux:
kill -9 <PID>
```

### Check Backend Logs
Look at the terminal where you ran `python run.py`. It will show:
- ✅ Successful requests
- ❌ Error messages
- 🔍 Debug information

## ✅ Success Indicators

When everything is working:
- ✅ Backend terminal shows: "Running on http://0.0.0.0:5000"
- ✅ Frontend connects without connection errors
- ✅ Login page loads without errors
- ✅ API calls return data (check browser console)

## 🆘 Still Having Issues?

1. **Check backend logs** - Look at terminal output
2. **Check frontend console** - Open browser DevTools (F12)
3. **Verify port 5000 is free** - Use netstat/lsof command
4. **Restart everything** - Close all terminals, start fresh
5. **Check firewall** - Make sure port 5000 isn't blocked

---

**Remember:** The backend server MUST be running for the frontend to work! 🚀


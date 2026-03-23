# 🚨 START BACKEND SERVER NOW

## You're seeing "Network Error" because the backend server is NOT running!

### ✅ EASIEST WAY - Double Click This File:
**`START_BACKEND.bat`** (in the root folder)

### OR Use Command Line:

1. **Open PowerShell or Command Prompt**

2. **Type these commands:**
   ```powershell
   cd C:\Users\PC\Desktop\dd\backend
   python run.py
   ```

3. **Wait until you see:**
   ```
   * Running on http://0.0.0.0:5000
   * Serving Flask app
   * Debug mode: on
   ```

4. **Keep that terminal window open!** (Don't close it - the server runs there)

5. **Go back to your browser and refresh the login page**

6. **The "Network Error" should be gone!** ✅

### ⚠️ Important:
- **Keep the terminal open** - closing it stops the server
- **Don't press Ctrl+C** unless you want to stop the server
- The server needs to keep running for the frontend to work

### 🔍 Verify It's Working:
1. Open: http://localhost:5000/api/auth/test
2. Should show: `{"status": "success", "message": "API is working"}`
3. If you see that, the server is running! ✅

### ❌ If You Get Errors:

**"Python is not recognized"**
- Install Python from https://www.python.org/
- Make sure to check "Add Python to PATH" during installation

**"Module not found"**
```powershell
cd backend
pip install -r requirements.txt
```

**"Port 5000 already in use"**
- Something else is using port 5000
- Find and close that application
- Or change SERVER_PORT in backend/config.py to 5001

---

**Once the server is running, refresh your frontend page and try logging in again!** 🚀


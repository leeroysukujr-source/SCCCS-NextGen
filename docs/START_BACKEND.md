# How to Start the Backend Server

## Quick Start (Windows)

1. **Double-click** `backend/start_backend.bat` 
   OR
2. **Run in terminal:**
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python run.py
   ```

## Verify Backend is Running

1. Open your browser and go to: `http://localhost:5000/api/auth/test`
2. You should see: `{"message": "Auth API is working", "status": "ok"}`

## Troubleshooting

### Port 5000 already in use
- Stop any other application using port 5000
- Or change the port in `backend/config.py` (SERVER_PORT)

### Backend won't start
- Make sure you're in the `backend` directory
- Activate the virtual environment: `.\venv\Scripts\Activate.ps1`
- Install dependencies: `pip install -r requirements.txt`

### Still having issues?
- Check that Python is installed: `python --version`
- Check that all dependencies are installed
- Look at the error messages in the terminal


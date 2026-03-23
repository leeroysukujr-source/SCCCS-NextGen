@echo off
echo Starting SCCCS NextGen Backend Server...
echo.

cd /d "%~dp0"

if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found. Please run: python -m venv venv
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Checking if backend is already running (LISTENING)...
rem Only consider the port in-use if a process is LISTENING on it (avoids SYN_SENT false-positives)
for /f "tokens=*" %%i in ('netstat -ano ^| findstr LISTENING ^| findstr :5000') do set FOUND=1
if defined FOUND (
    echo Backend is already running on port 5000 (LISTENING)!
    echo Please stop it first or use a different port.
    pause
    exit /b 1
)

echo Starting Flask server...
echo Backend will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

python run.py

pause


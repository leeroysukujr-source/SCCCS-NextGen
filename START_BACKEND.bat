@echo off
echo ========================================================================
echo                    STARTING BACKEND SERVER
echo ========================================================================
echo.
echo This will start the Flask backend server on port 5000
echo.
echo Keep this window open while the server is running!
echo Press Ctrl+C to stop the server.
echo.
echo ========================================================================
echo.

cd /d "%~dp0backend"

echo Checking for Python...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH!
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo.
echo Activating virtual environment (if exists)...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo Virtual environment activated!
) else (
    echo No virtual environment found. Using system Python.
)

echo.
echo Starting server...
echo.
python run.py

pause


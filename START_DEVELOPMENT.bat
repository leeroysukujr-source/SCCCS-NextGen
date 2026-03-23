@echo off
echo ========================================================================
echo                STARTING SCCCS DEVELOPMENT ENVIRONMENT
echo ========================================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend...
start "SCCCS Backend" cmd /k "echo Starting Backend... && cd /d %~dp0backend && if exist venv\Scripts\activate.bat ( call venv\Scripts\activate.bat ) else ( echo WARNING: No venv found, using system Python. ) && python run.py"

echo [2/2] Starting Frontend...
start "SCCCS Frontend" cmd /k "echo Starting Frontend... && cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================================
echo Both Backend and Frontend are starting in separate windows.
echo Keep those windows open while developing!
echo ========================================================================
echo.
timeout /t 5

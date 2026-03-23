@echo off
REM ====================================
REM One-Click System Startup
REM SCCCS Production Environment
REM ====================================

setlocal enabledelayedexpansion

echo.
echo =====================================
echo SCCCS System Startup
echo =====================================
echo.

echo [1/4] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo X Docker is not installed or not in PATH
    echo Please install Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✓ Docker is available

echo.
echo [2/4] Starting Docker Compose stack...
cd /d "%~dp0"
docker compose -f docker-compose.prod.yml up -d
echo ✓ Services started

echo.
echo [3/4] Waiting for services to be ready...
timeout /t 10 /nobreak

echo.
echo [4/4] System Status:
echo.
docker compose -f docker-compose.prod.yml ps
echo.

echo.
echo Running health checks...
echo.
python .\backend\tools\smoke_test.py

echo.
echo =====================================
echo System is running!
echo =====================================
echo.
echo Access your services:
echo   Frontend:  http://localhost
echo   Backend:   http://localhost:5000
echo   Mediasoup: localhost:4000
echo.
echo To stop: docker compose -f docker-compose.prod.yml down
echo.
pause

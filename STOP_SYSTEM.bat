@echo off
REM One-click shutdown for SCCCS production system
REM Double-click this file to stop all services

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0STOP_SYSTEM.ps1" %*
pause

@echo off
REM One-click startup for SCCCS production system
REM Double-click this file to start the system

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_SYSTEM.ps1" %*
pause

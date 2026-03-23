#!/usr/bin/env pwsh
<#
.SYNOPSIS
One-click shutdown script for the SCCCS production system

.DESCRIPTION
Shuts down all Docker Compose services gracefully.
#>

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "" 
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "SCCCS System Shutdown" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping all services..." -ForegroundColor Yellow
Set-Location $scriptDir
docker compose -f docker-compose.prod.yml down

Write-Host ""
Write-Host "✓ All services stopped" -ForegroundColor Green
Write-Host ""

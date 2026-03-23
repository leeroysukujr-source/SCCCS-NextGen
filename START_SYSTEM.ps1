param(
    [switch]$NoWait,
    [switch]$NoTests
)

$ErrorActionPreference = "Continue"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "SCCCS System Startup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>&1
if ($?) {
    Write-Host "✓ Docker is available: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Bring up stack
Write-Host ""
Write-Host "[2/4] Starting Docker Compose stack..." -ForegroundColor Yellow
Set-Location $scriptDir
docker compose -f docker-compose.prod.yml up -d
Write-Host "✓ Services started" -ForegroundColor Green

# Wait for services to be ready
if (-not $NoWait) {
    Write-Host ""
    Write-Host "[3/4] Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Show status
Write-Host ""
Write-Host "[4/4] System Status:" -ForegroundColor Yellow
Write-Host ""
docker compose -f docker-compose.prod.yml ps
Write-Host ""

# Run smoke tests
if (-not $NoTests) {
    Write-Host ""
    Write-Host "Running health checks..." -ForegroundColor Yellow
    Write-Host ""
    python .\backend\tools\smoke_test.py
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "System is running!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your services:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost" -ForegroundColor White
Write-Host "  Backend:   http://localhost:5000" -ForegroundColor White
Write-Host "  Mediasoup: localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "To stop: docker compose -f docker-compose.prod.yml down" -ForegroundColor Gray
Write-Host ""

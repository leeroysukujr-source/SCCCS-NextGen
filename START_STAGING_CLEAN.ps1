# Staging Deployment Verification and Startup Script
# Usage: powershell -ExecutionPolicy Bypass -File START_STAGING_CLEAN.ps1

param(
    [switch]$NoStart,
    [string]$Port = "8001"
)

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Staging Deployment Verification and Startup" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

# Step 1: Check Prerequisites
Write-Host "[1] Checking Prerequisites..." -ForegroundColor Cyan

$pythonOk = (python --version 2>&1) -match '\d+\.\d+'
$nodeOk = (node --version 2>&1) -match 'v\d+'
$npmOk = (npm --version 2>&1) -match '\d+\.\d+'

Write-Host "  Python: $(if($pythonOk){'OK'}else{'MISSING'})" -ForegroundColor $(if($pythonOk){'Green'}else{'Red'})
Write-Host "  Node.js: $(if($nodeOk){'OK'}else{'MISSING'})" -ForegroundColor $(if($nodeOk){'Green'}else{'Red'})
Write-Host "  npm: $(if($npmOk){'OK'}else{'MISSING'})" -ForegroundColor $(if($npmOk){'Green'}else{'Red'})

# Step 2: Check Directories and Files
Write-Host ""
Write-Host "[2] Checking Directory Structure..." -ForegroundColor Cyan

$backendOk = Test-Path 'C:\Users\PC\Desktop\dd\backend\ai\ai_service.py'
$frontendOk = Test-Path 'C:\Users\PC\Desktop\dd\frontend\dist\index.html'
$dockerOk = Test-Path 'C:\Users\PC\Desktop\dd\docker-compose.ai.yml'

Write-Host "  Backend service: $(if($backendOk){'OK'}else{'MISSING'})" -ForegroundColor $(if($backendOk){'Green'}else{'Red'})
Write-Host "  Frontend build: $(if($frontendOk){'OK'}else{'MISSING'})" -ForegroundColor $(if($frontendOk){'Green'}else{'Red'})
Write-Host "  Docker config: $(if($dockerOk){'OK'}else{'MISSING'})" -ForegroundColor $(if($dockerOk){'Green'}else{'Red'})

# Step 3: Check Dependencies
Write-Host ""
Write-Host "[3] Checking Python Dependencies..." -ForegroundColor Cyan

$output = python -c "import fastapi; print('OK')" 2>&1
$fastAPIOk = $output -like "*OK*"
Write-Host "  FastAPI: $(if($fastAPIOk){'OK'}else{'MISSING'})" -ForegroundColor $(if($fastAPIOk){'Green'}else{'Red'})

# Step 4: Port Check
Write-Host ""
Write-Host "[4] Checking Port Availability..." -ForegroundColor Cyan

$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
$portOk = -not $portInUse

if ($portOk) {
    Write-Host "  Port $Port : AVAILABLE" -ForegroundColor Green
} else {
    Write-Host "  Port $Port : IN USE (finding alternative...)" -ForegroundColor Yellow
    $testPort = 8002
    while ((Get-NetTCPConnection -LocalPort $testPort -ErrorAction SilentlyContinue)) {
        $testPort++
    }
    Write-Host "  Port $testPort : AVAILABLE" -ForegroundColor Green
    $Port = $testPort
}

# Summary
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Summary" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

$allOk = $pythonOk -and $nodeOk -and $npmOk -and $backendOk -and $frontendOk -and $dockerOk -and $fastAPIOk

if ($allOk) {
    Write-Host ""
    Write-Host "SUCCESS - All systems ready for deployment!" -ForegroundColor Green
    Write-Host ""
    
    # Start services if requested
    if (-not $NoStart) {
        Write-Host "Starting AI Service..." -ForegroundColor Cyan
        Write-Host ""
        
        Set-Location 'C:\Users\PC\Desktop\dd\backend\ai'
        
        Write-Host "Service starting on port $Port..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "ACCESS POINTS:" -ForegroundColor Green
        Write-Host "  - API: http://localhost:$Port" -ForegroundColor Cyan
        Write-Host "  - Docs: http://localhost:$Port/docs" -ForegroundColor Cyan
        Write-Host "  - ReDoc: http://localhost:$Port/redoc" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow
        Write-Host ""
        
        python -m uvicorn ai_service:app --host 0.0.0.0 --port $Port
    }
} else {
    Write-Host ""
    Write-Host "FAILED - Some components are missing:" -ForegroundColor Red
    Write-Host ""
    if (-not $pythonOk) { Write-Host "  - Python not found" -ForegroundColor Yellow }
    if (-not $nodeOk) { Write-Host "  - Node.js not found" -ForegroundColor Yellow }
    if (-not $npmOk) { Write-Host "  - npm not found" -ForegroundColor Yellow }
    if (-not $backendOk) { Write-Host "  - Backend service not found" -ForegroundColor Yellow }
    if (-not $frontendOk) { Write-Host "  - Frontend build not found" -ForegroundColor Yellow }
    if (-not $dockerOk) { Write-Host "  - Docker config not found" -ForegroundColor Yellow }
    if (-not $fastAPIOk) { Write-Host "  - FastAPI not installed" -ForegroundColor Yellow }
    Write-Host ""
}

Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - STAGING_MASTER_GUIDE.md - Complete guide" -ForegroundColor White
Write-Host "  - STAGING_QUICK_START.md - Quick reference" -ForegroundColor White
Write-Host ""

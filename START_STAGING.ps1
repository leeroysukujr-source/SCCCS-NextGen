# Staging Deployment Verification & Startup Script
# This script verifies all components are ready and starts the staging deployment

param(
    [switch]$NoStart,
    [switch]$Docker,
    [string]$Port = "8001"
)

Write-Host "`n" -ForegroundColor Green
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   🚀 Staging Deployment Verification & Startup Script     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Colors
$SuccessColor = 'Green'
$ErrorColor = 'Red'
$WarningColor = 'Yellow'
$InfoColor = 'Cyan'

# Helper functions
function Test-Component {
    param([string]$Name, [scriptblock]$Test)
    Write-Host "Checking: $Name..." -ForegroundColor $InfoColor -NoNewline
    try {
        $result = & $Test
        if ($result) {
            Write-Host " ✅" -ForegroundColor $SuccessColor
            return $true
        } else {
            Write-Host " ❌" -ForegroundColor $ErrorColor
            return $false
        }
    } catch {
        Write-Host " ❌ ($_)" -ForegroundColor $ErrorColor
        return $false
    }
}

# Step 1: Verify Prerequisites
Write-Host "`n📋 Step 1: Verifying Prerequisites" -ForegroundColor $InfoColor
Write-Host "─" * 60 -ForegroundColor $InfoColor

$pythonOk = Test-Component "Python installed" { (python --version 2>&1) -match '\d+\.\d+' }
$nodeOk = Test-Component "Node.js installed" { (node --version 2>&1) -match 'v\d+' }
$npmOk = Test-Component "npm installed" { (npm --version 2>&1) -match '\d+\.\d+' }
$dockerOk = $true
if ($Docker) {
    $dockerOk = Test-Component "Docker running" { (docker ps 2>&1) -notmatch 'Cannot connect' }
}

# Step 2: Verify Directory Structure
Write-Host "`n📁 Step 2: Verifying Directory Structure" -ForegroundColor $InfoColor
Write-Host "─" * 60 -ForegroundColor $InfoColor

$backendOk = Test-Component "Backend AI service exists" { Test-Path 'C:\Users\PC\Desktop\dd\backend\ai\ai_service.py' }
$frontendOk = Test-Component "Frontend build exists" { Test-Path 'C:\Users\PC\Desktop\dd\frontend\dist\index.html' }
$dockerComposeOk = Test-Component "Docker Compose file exists" { Test-Path 'C:\Users\PC\Desktop\dd\docker-compose.ai.yml' }

# Step 3: Verify Configuration Files
Write-Host "`n⚙️  Step 3: Verifying Configuration Files" -ForegroundColor $InfoColor
Write-Host "─" * 60 -ForegroundColor $InfoColor

$aiEnvOk = Test-Component "AI Service .env exists" { Test-Path 'C:\Users\PC\Desktop\dd\backend\ai\.env' }
$viteConfigOk = Test-Component "Vite config exists" { Test-Path 'C:\Users\PC\Desktop\dd\frontend\vite.config.js' }
$nginxConfigOk = Test-Component "Nginx config exists" { Test-Path 'C:\Users\PC\Desktop\dd\nginx.conf' }

# Step 4: Verify Dependencies
Write-Host "`n📦 Step 4: Verifying Python Dependencies" -ForegroundColor $InfoColor
Write-Host "─" * 60 -ForegroundColor $InfoColor

$fastAPICheck = Test-Component "FastAPI installed" {
    python -c "import fastapi" 2>&1 | Out-Null
    $LASTEXITCODE -eq 0
}

$corsCheck = Test-Component "CORS Middleware available" {
    python -c "from fastapi.middleware.cors import CORSMiddleware" 2>&1 | Out-Null
    $LASTEXITCODE -eq 0
}

$dotenvCheck = Test-Component "python-dotenv installed" {
    python -c "from dotenv import load_dotenv" 2>&1 | Out-Null
    $LASTEXITCODE -eq 0
}

# Step 5: Check Port Availability
Write-Host "`n🔌 Step 5: Checking Port Availability" -ForegroundColor $InfoColor
Write-Host "─" * 60 -ForegroundColor $InfoColor

$portAvailable = Test-Component "Port $Port is available" {
    -not (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue)
}

if (-not $portAvailable) {
    Write-Host "  ⚠️  Port $Port is in use. Finding alternative..." -ForegroundColor $WarningColor
    $altPort = 9001
    while (Get-NetTCPConnection -LocalPort $altPort -ErrorAction SilentlyContinue) {
        $altPort++
    }
    Write-Host "  📍 Using alternative port: $altPort" -ForegroundColor $InfoColor
    $Port = $altPort
}

# Summary
Write-Host "`n📊 Verification Summary" -ForegroundColor $InfoColor
Write-Host "─" * 60 -ForegroundColor $InfoColor

$allOk = $pythonOk -and $nodeOk -and $npmOk -and $backendOk -and $frontendOk -and $dockerComposeOk -and $aiEnvOk -and $viteConfigOk -and $nginxConfigOk -and $fastAPICheck -and $corsCheck -and $dotenvCheck

if ($allOk) {
    Write-Host "✅ All checks passed! Ready for deployment." -ForegroundColor $SuccessColor
} else {
    Write-Host "⚠️  Some checks failed. See above for details." -ForegroundColor $WarningColor
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor $WarningColor
    if (-not $pythonOk) { Write-Host "  • Install Python 3.9+: https://www.python.org/downloads/" }
    if (-not $nodeOk) { Write-Host "  • Install Node.js: https://nodejs.org/" }
    if (-not $backendOk) { Write-Host "  • Backend AI service not found" }
    if (-not $frontendOk) { Write-Host "  • Run: cd frontend; npm run build" }
}

# Option to start services
if (-not $NoStart -and $allOk) {
    Write-Host ""
    Write-Host "🚀 Ready to Start Services" -ForegroundColor $SuccessColor
    Write-Host ""
    
    if ($Docker) {
        $choice = Read-Host "Start services with Docker? (Y/n)"
        if ($choice -ne 'n' -and $choice -ne 'N') {
            Write-Host "`nStarting Docker services..." -ForegroundColor $InfoColor
            Set-Location 'C:\Users\PC\Desktop\dd'
            docker-compose -f docker-compose.ai.yml up -d
            Write-Host "✅ Services started!" -ForegroundColor $SuccessColor
            Write-Host "📍 AI Service: http://localhost:8001" -ForegroundColor $InfoColor
            Write-Host "📍 API Docs:   http://localhost:8001/docs" -ForegroundColor $InfoColor
            Start-Sleep -Seconds 2
            
            Write-Host "`nChecking service health..." -ForegroundColor $InfoColor
            $healthCheck = curl http://localhost:8001/health 2>&1
            if ($healthCheck -match 'ok') {
                Write-Host "✅ Service is healthy!" -ForegroundColor $SuccessColor
            } else {
                Write-Host "⚠️  Service health check response: $healthCheck" -ForegroundColor $WarningColor
            }
        }
    } else {
        $choice = Read-Host "Start AI service with Python? (Y/n)"
        if ($choice -ne 'n' -and $choice -ne 'N') {
            Write-Host "`nStarting AI service..." -ForegroundColor $InfoColor
            Set-Location 'C:\Users\PC\Desktop\dd\backend\ai'
            
            Write-Host ""
            Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $SuccessColor
            Write-Host "║   ✅ Service Starting (Press Ctrl+C to stop)              ║" -ForegroundColor $SuccessColor
            Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $SuccessColor
            Write-Host ""
            
            & python -m uvicorn ai_service:app --host 0.0.0.0 --port $Port
        }
    }
}

Write-Host ""
Write-Host "📚 For more information, see:" -ForegroundColor $InfoColor
Write-Host "   • STAGING_MASTER_GUIDE.md" -ForegroundColor $InfoColor
Write-Host "   • STAGING_QUICK_START.md" -ForegroundColor $InfoColor
Write-Host "   • STAGING_DEPLOYMENT_STATUS.md" -ForegroundColor $InfoColor
Write-Host ""

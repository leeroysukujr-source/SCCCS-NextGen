# deploy_docker.ps1
# PowerShell helper script to build and deploy SCCCS with docker-compose
# Usage: Run this after installing Docker Desktop on Windows (and enabling WSL2 if needed).

param(
    [switch]$BuildOnly,
    [switch]$UpDetached = $true
)

function Check-Command {
    param([string]$cmd)
    try {
        & $cmd --version > $null 2>&1
        return $true
    } catch {
        return $false
    }
}

if (-not (Check-Command docker)) {
    Write-Error "Docker not found. Install Docker Desktop for Windows and ensure 'docker' is on PATH. See https://www.docker.com/get-started"
    exit 2
}

if (-not (Check-Command 'docker compose')) {
    Write-Host "docker-compose plugin not found. Using 'docker compose' (Docker CLI v2)."
}

$composeFile = "docker-compose.prod.yml"

Write-Host "Building images from $composeFile... (this may take several minutes)"
docker compose -f $composeFile build --pull
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

if ($BuildOnly) {
    Write-Host "Build complete. Use the next steps to run the stack."
    exit 0
}

Write-Host "Bringing up stack ($composeFile)"
if ($UpDetached) {
    docker compose -f $composeFile up -d
} else {
    docker compose -f $composeFile up
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose up failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Stack started. Show running containers:"
docker compose -f $composeFile ps

Write-Host "To tail logs: docker compose -f $composeFile logs -f"
Write-Host "To run smoke tests inside the backend container:"
Write-Host "  docker compose -f $composeFile exec backend python tools/smoke_test.py"

Write-Host "Done. If smoke tests fail, inspect logs and address errors."

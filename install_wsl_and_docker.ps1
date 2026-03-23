<#
install_wsl_and_docker.ps1

Purpose: Enable WSL2 and install Docker Desktop on Windows.
Usage: Run this script from an elevated PowerShell (Run as Administrator).
If run without elevation it will re-launch itself as Administrator.

Notes:
- This script will enable required Windows optional features (WSL, VirtualMachinePlatform, Hyper-V).
- It will download and install the WSL2 kernel update package.
- It will set WSL2 as the default version and optionally install Ubuntu.
- It will download Docker Desktop installer and launch it (GUI installer). You must approve the UAC prompt.
- A reboot may be required after enabling Windows features.

#>

[CmdletBinding()]
param(
    [switch]$InstallUbuntu = $false,
    [switch]$AutoReboot = $false,
    [switch]$SkipDockerLaunch = $false
)

function Is-Administrator {
    $current = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $current.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Relaunch-Elevated {
    Write-Host "Not running as Administrator. Relaunching elevated..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell.exe'
    $script = $MyInvocation.MyCommand.Definition
    $args = "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
    if ($PSBoundParameters['InstallUbuntu']) { $args += ' -InstallUbuntu' }
    if ($PSBoundParameters['AutoReboot']) { $args += ' -AutoReboot' }
    if ($PSBoundParameters['SkipDockerLaunch']) { $args += ' -SkipDockerLaunch' }
    $psi.Arguments = $args
    $psi.Verb = 'runas'
    try {
        [System.Diagnostics.Process]::Start($psi) | Out-Null
    } catch {
        Write-Error "Failed to start elevated PowerShell: $_"
    }
    exit
}

if (-not (Is-Administrator)) {
    Relaunch-Elevated
}

Write-Host "Running with Administrator privileges." -ForegroundColor Green

# Enable Windows features
$features = @(
    'Microsoft-Windows-Subsystem-Linux',
    'VirtualMachinePlatform',
    'Microsoft-Hyper-V-All'
)

$needRestart = $false
foreach ($f in $features) {
    Write-Host "Enabling feature: $f"
    $res = Dism.exe /online /enable-feature /featurename:$f /all /norestart 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Command returned code $LASTEXITCODE for $f. Output: $res"
    } else {
        Write-Host "Feature $f enabled or already enabled."
    }
}

# Install WSL2 kernel update
$wslUrl = 'https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi'
$wslDest = Join-Path $env:USERPROFILE 'Downloads\wsl_update_x64.msi'
if (-not (Test-Path $wslDest)) {
    Write-Host "Downloading WSL2 kernel update to $wslDest"
    try {
        Invoke-WebRequest -Uri $wslUrl -OutFile $wslDest -UseBasicParsing -ErrorAction Stop
        Write-Host "Downloaded WSL kernel update. Installing..."
        Start-Process msiexec.exe -ArgumentList "/i `"$wslDest`" /qn /norestart" -Wait
        Write-Host "WSL kernel installer finished." -ForegroundColor Green
    } catch {
        Write-Warning "Failed to download or install WSL kernel: $_"
        Write-Host "You may need to manually download: $wslUrl"
    }
} else {
    Write-Host "WSL kernel installer already exists at $wslDest. Skipping download."
}

# Set default WSL version to 2
try {
    Write-Host "Setting WSL default version to 2..."
    wsl --set-default-version 2
    Write-Host "WSL default version set to 2." -ForegroundColor Green
} catch {
    Write-Warning "Failed to set WSL default version to 2: $_"
    Write-Host "If this fails, ensure Windows is up-to-date and rebooted after enabling features."
}

# Optionally install Ubuntu
if ($InstallUbuntu) {
    try {
        Write-Host "Installing Ubuntu via WSL..."
        wsl --install -d Ubuntu
        Write-Host "Ubuntu installation requested. Follow on-screen prompts in the Ubuntu terminal to create your user."
    } catch {
        Write-Warning "Failed to install Ubuntu via WSL: $_"
    }
}

# Download Docker Desktop
$dockerUrl = 'https://desktop.docker.com/win/stable/amd64/Docker%20Desktop%20Installer.exe'
$dockerDest = Join-Path $env:USERPROFILE 'Downloads\DockerDesktopInstaller.exe'
if (-not (Test-Path $dockerDest)) {
    Write-Host "Downloading Docker Desktop installer to $dockerDest"
    try {
        Invoke-WebRequest -Uri $dockerUrl -OutFile $dockerDest -UseBasicParsing -ErrorAction Stop
        Write-Host "Downloaded Docker Desktop installer." -ForegroundColor Green
    } catch {
        Write-Warning "Failed to download Docker Desktop installer: $_"
        Write-Host "Please download manually from https://www.docker.com/get-started"
    }
} else {
    Write-Host "Docker installer already exists at $dockerDest. Skipping download."
}

if (-not $SkipDockerLaunch) {
    Write-Host "Launching Docker Desktop installer. This will prompt for UAC approval."
    try {
        Start-Process -FilePath $dockerDest -Verb RunAs
        Write-Host "Docker Desktop installer launched. Follow the GUI steps to complete installation." -ForegroundColor Green
    } catch {
        Write-Warning "Failed to start Docker installer: $_"
        Write-Host "You can run the installer at: $dockerDest"
    }
} else {
    Write-Host "Skipping automatic Docker Desktop launch as requested." -ForegroundColor Yellow
}

Write-Host "\nIMPORTANT: After enabling features and/or installing Docker you may need to reboot the machine."
if ($AutoReboot) {
    Write-Host "Rebooting now as requested..."
    Restart-Computer
}

Write-Host "\nNext steps after reboot and Docker install (run in a normal PowerShell):"
Write-Host "  docker --version"
Write-Host "  docker compose version"
Write-Host "  # Then run the helper script to deploy the stack:" 
Write-Host "  .\\deploy_docker.ps1"

Write-Host "\nIf you want me to proceed after you run this, tell me once Docker is installed and running and I'll build and deploy the docker-compose stack and run the smoke tests inside containers."

Write-Host "Done."

param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"
$PosRoot = Split-Path -Parent $PSScriptRoot
$AppUrl = "http://127.0.0.1:$Port/orders/new"
$HealthUrl = "http://127.0.0.1:$Port/"
$DataRoot = Join-Path $env:LOCALAPPDATA "KrunchiesPOS"
$LogRoot = Join-Path $DataRoot "logs"
$ChromeProfile = Join-Path $DataRoot "chrome-profile"

New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ChromeProfile | Out-Null

function Test-PosReady {
  try {
    Invoke-WebRequest `
      -Uri $HealthUrl `
      -UseBasicParsing `
      -TimeoutSec 2 `
      -MaximumRedirection 0 `
      -ErrorAction Stop | Out-Null
    return $true
  } catch {
    # A redirect still proves that the local Next server is answering.
    if ($_.Exception.Response) {
      return $true
    }
    return $false
  }
}

function Show-PosError([string]$Message) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show(
    $Message,
    "Krunchies POS",
    [System.Windows.MessageBoxButton]::OK,
    [System.Windows.MessageBoxImage]::Error
  ) | Out-Null
}

if (-not (Test-Path (Join-Path $PosRoot ".next\BUILD_ID"))) {
  Show-PosError "The local production build is missing. Run scripts\Setup-Local-POS.ps1 once as the owner/developer."
  exit 1
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Show-PosError "Node.js is missing. Install Node.js 20 LTS, then run Setup-Local-POS.ps1."
  exit 1
}

if (-not (Test-PosReady)) {
  $StdOut = Join-Path $LogRoot "server.log"
  $StdErr = Join-Path $LogRoot "server-error.log"
  Start-Process `
    -FilePath (Get-Command npm.cmd).Source `
    -ArgumentList @("run", "start:local") `
    -WorkingDirectory $PosRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $StdOut `
    -RedirectStandardError $StdErr

  $Deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $Deadline -and -not (Test-PosReady)) {
    Start-Sleep -Milliseconds 400
  }
}

if (-not (Test-PosReady)) {
  Show-PosError "The local POS server did not start. Check $LogRoot or run Setup-Local-POS.ps1 again."
  exit 1
}

$ChromeCandidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
)
$Chrome = $ChromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $Chrome) {
  Show-PosError "Google Chrome was not found. Install Chrome and try again."
  exit 1
}

Start-Process `
  -FilePath $Chrome `
  -ArgumentList @(
    "--user-data-dir=$ChromeProfile",
    "--no-first-run",
    "--disable-session-crashed-bubble",
    "--kiosk-printing",
    "--disable-print-preview",
    "--app=$AppUrl"
  )

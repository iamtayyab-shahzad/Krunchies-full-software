@echo off
REM ============================================================
REM Krunchies POS — silent thermal printing launcher
REM ============================================================
REM Browsers normally show a Print / Cancel dialog. Chrome's
REM --kiosk-printing flag sends receipts straight to the default
REM printer with NO dialog (required for counter staff speed).
REM
REM Setup once:
REM   1. Install Chrome
REM   2. Set your iTech receipt printer as Windows DEFAULT printer
REM   3. Edit POS_URL below to your live POS URL
REM   4. Put this shortcut on the cashier desktop
REM
REM Tip: If the printer errors after many tickets, restart Chrome and the
REM Windows Print Spooler. POS queues prints one-at-a-time to reduce that.
REM ============================================================

set "POS_URL=http://localhost:3001"

set "CHROME="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if "%CHROME%"=="" (
  echo Chrome not found. Install Google Chrome, then run this again.
  pause
  exit /b 1
)

start "" "%CHROME%" --kiosk-printing --disable-print-preview --app="%POS_URL%"
exit /b 0

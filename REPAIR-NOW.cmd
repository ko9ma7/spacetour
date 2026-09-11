@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\SpaceTour-Manager.ps1" -Action setup
if errorlevel 1 (
  echo.
  echo [SpaceTour] Repair failed. See the error above.
)
pause

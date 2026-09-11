@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\SpaceTour-Manager.ps1" -Action import
if errorlevel 1 (
  echo.
  echo [SpaceTour] Could not import the property folder. See the error above.
  pause
)
endlocal

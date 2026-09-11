@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo   SpaceTour v8 - Public Viewer / Local Studio Migration
echo ============================================================
echo.
echo This will migrate legacy public content, remove public Admin,
echo build the read-only Viewer, commit, push, and request deployment.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\SpaceTour-Manager.ps1" -Action publish
if errorlevel 1 (
  echo.
  echo [SpaceTour] Migration/upload failed. See the error above.
  pause
)
endlocal

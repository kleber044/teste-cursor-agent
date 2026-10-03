@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FGM-Install.ps1" -Action install -Profile medium %*
exit /b %ERRORLEVEL%

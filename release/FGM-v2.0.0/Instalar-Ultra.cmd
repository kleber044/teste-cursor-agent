@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Installer\FGM-Install.ps1" -Action install -Profile ultra %*
exit /b %ERRORLEVEL%

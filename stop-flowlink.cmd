@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo Stopping FlowLink backend and frontend...
for %%p in (5173 8080 8090) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>nul
  )
)

echo.
echo Backend/frontend stopped.
echo Docker services are still running so MySQL data is preserved.
echo To stop MySQL, Redis and MinIO too, run:
echo   stop-infra.cmd
pause

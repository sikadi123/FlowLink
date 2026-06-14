@echo off
set ROOT=%~dp0
start "FlowLink Backend Prod" cmd /k "cd /d %ROOT%backend && start-prod-backend.cmd"
start "FlowLink Frontend" cmd /k "cd /d %ROOT%frontend && npm.cmd run dev"
echo FlowLink backend: http://localhost:8080
echo FlowLink frontend: http://localhost:5173
echo.
echo Make sure MySQL, Redis and MinIO are running first:
echo   start-infra.cmd

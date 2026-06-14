@echo off
set ROOT=%~dp0
start "FlowLink Backend" cmd /k "cd /d %ROOT%backend && mvnw.cmd spring-boot:run ""-Dspring-boot.run.profiles=local"""
start "FlowLink Frontend" cmd /k "cd /d %ROOT%frontend && npm.cmd run dev"
echo FlowLink backend: http://localhost:8080
echo FlowLink frontend: http://localhost:5173

@echo off
cd /d "%~dp0"
set "DOCKER=docker"
where docker >nul 2>nul
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin;%PATH%"
    set "DOCKER=%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe"
  ) else if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
    set "PATH=%ProgramFiles%\Docker\Docker\resources\bin;%PATH%"
    set "DOCKER=%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
  ) else (
    echo Docker CLI was not found.
    exit /b 1
  )
)
"%DOCKER%" compose down

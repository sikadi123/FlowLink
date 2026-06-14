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
    echo Please restart your terminal or reinstall Docker Desktop with CLI support.
    exit /b 1
  )
)
"%DOCKER%" compose up -d mysql redis minio minio-init
"%DOCKER%" compose ps
echo.
echo MySQL: localhost:3307 database=flowlink user=flowlink password=flowlink123
echo Redis: localhost:6379
echo MinIO API: http://localhost:9000
echo MinIO Console: http://localhost:9001 username=minioadmin password=minioadmin

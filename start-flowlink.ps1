$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Find-Docker {
  $command = Get-Command docker.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe"),
    (Join-Path $env:ProgramFiles "Docker\Docker\resources\bin\docker.exe")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $env:PATH = "$(Split-Path $candidate);$env:PATH"
      return $candidate
    }
  }

  throw "Docker CLI was not found. Start or reinstall Docker Desktop."
}

function Stop-PortProcess([int] $port) {
  $processIds = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

function Wait-Port([int] $port, [int] $seconds) {
  for ($attempt = 0; $attempt -lt $seconds; $attempt++) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Wait-Http([string] $url, [int] $seconds) {
  for ($attempt = 0; $attempt -lt $seconds; $attempt++) {
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
      return $true
    } catch {
      if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) {
        return $true
      }
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

try {
  Set-Location $root
  $docker = Find-Docker

  Write-Host "[1/4] Starting MySQL, Redis and MinIO..."
  & $docker compose up -d mysql redis minio minio-init
  if ($LASTEXITCODE -ne 0) {
    throw "Docker services failed to start."
  }

  Write-Host "[2/4] Waiting for MySQL..."
  $mysqlReady = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    $health = (& $docker inspect -f "{{.State.Health.Status}}" flowlink-mysql 2>$null).Trim()
    if ($health -eq "healthy") {
      $mysqlReady = $true
      break
    }
    Start-Sleep -Seconds 2
  }
  if (-not $mysqlReady) {
    throw "MySQL did not become healthy. Check Docker Desktop."
  }

  Write-Host "Stopping old FlowLink application processes..."
  5173, 8080, 8090 | ForEach-Object { Stop-PortProcess $_ }

  Write-Host "[3/4] Starting Spring Boot backend..."
  $backendCommand = "chcp 65001 >nul && cd /d `"$root\backend`" && mvnw.cmd spring-boot:run"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCommand -WindowStyle Normal

  $backendReady = Wait-Http "http://localhost:8080/api/bootstrap" 90
  if (-not $backendReady) {
    throw "Backend did not become ready on http://localhost:8080. Check the backend window."
  }

  Write-Host "[4/4] Starting Vue frontend..."
  $frontendCommand = "chcp 65001 >nul && cd /d `"$root\frontend`" && npm.cmd run dev"
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $frontendCommand -WindowStyle Normal

  $frontendReady = Wait-Port 5173 60
  if (-not $frontendReady) {
    throw "Frontend did not start on port 5173. Check the frontend window."
  }

  Write-Host ""
  Write-Host "FlowLink is ready:"
  Write-Host "  Frontend: http://localhost:5173"
  Write-Host "  Backend:  http://localhost:8080"
  Write-Host "  MinIO:    http://localhost:9001"
  Start-Process "http://localhost:5173"
} catch {
  Write-Host ""
  Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

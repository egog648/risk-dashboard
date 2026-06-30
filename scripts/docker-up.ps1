param(
    [switch]$Build,
    [switch]$Bootstrap,
    [int]$HealthTimeoutSec = 60,
    [int]$BootstrapTimeoutSec = 180
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Ensure-EnvFiles {
    $backendEnv = Join-Path $Root "backend\.env"
    if (-not (Test-Path $backendEnv)) {
        Write-Error @"
backend/.env is missing.
Copy backend/.env.example to backend/.env and set FRED_API_KEY and TIINGO_API_KEY.
"@
    }

    $frontendEnv = Join-Path $Root "frontend\.env.local"
    $frontendExample = Join-Path $Root "frontend\.env.local.example"
    if (-not (Test-Path $frontendEnv)) {
        if (Test-Path $frontendExample) {
            Copy-Item $frontendExample $frontendEnv
            Write-Host "Created frontend/.env.local from .env.local.example"
        } else {
            Set-Content -Path $frontendEnv -Value "NEXT_PUBLIC_API_URL=http://localhost:8000`n"
            Write-Host "Created frontend/.env.local with default API URL"
        }
    }
}

function Wait-BackendHealth {
    param([int]$TimeoutSec)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    $healthUrl = "http://localhost:8000/health"

    Write-Host "Waiting for backend health at $healthUrl ..."
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
            if ($resp.status -eq "ok") {
                Write-Host "Backend is healthy."
                return
            }
        } catch {
            # retry
        }
        Start-Sleep -Seconds 2
    }
    throw "Backend did not become healthy within ${TimeoutSec}s. Check: docker compose logs backend"
}

function Invoke-DataBootstrap {
    param([int]$TimeoutSec)
    $statusUrl = "http://localhost:8000/api/v1/data-status"
    $refreshUrl = "http://localhost:8000/api/v1/data-status/refresh"

    Write-Host "Triggering initial data refresh ..."
    Invoke-RestMethod -Method POST -Uri $refreshUrl -TimeoutSec 30 | Out-Null

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "Polling data status until overall_status is not error ..."
    while ((Get-Date) -lt $deadline) {
        $status = Invoke-RestMethod -Uri $statusUrl -TimeoutSec 10
        if ($status.overall_status -ne "error") {
            Write-Host "Data status: $($status.overall_status)"
            return
        }
        Start-Sleep -Seconds 5
    }
    throw "Data bootstrap did not complete within ${TimeoutSec}s. Check: GET $statusUrl"
}

Ensure-EnvFiles

$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

Push-Location $Root
try {
    if ($Build) {
        Write-Host "Building images (docker compose build) ..."
        docker compose build
        if ($LASTEXITCODE -ne 0) { throw "docker compose build failed" }
    }

    Write-Host "Starting services (docker compose up -d) ..."
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

    Wait-BackendHealth -TimeoutSec $HealthTimeoutSec

    if ($Bootstrap) {
        Invoke-DataBootstrap -TimeoutSec $BootstrapTimeoutSec
    }

    Write-Host ""
    Write-Host "Risk Dashboard is running:"
    Write-Host "  Frontend:  http://localhost:3000"
    Write-Host "  API docs:  http://localhost:8000/docs"
    Write-Host "  Health:    http://localhost:8000/health"
    if (-not $Bootstrap) {
        Write-Host ""
        Write-Host "Tip: run with -Bootstrap on first launch to refresh market data."
    }
    Write-Host ""
    Write-Host "Logs: docker compose logs -f"
    Write-Host "Stop: docker compose down"
} finally {
    Pop-Location
}

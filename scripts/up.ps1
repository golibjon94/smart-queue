# Loyihani ishga tushiradi (5 servis). Kod o'zgargan bo'lsa: .\scripts\up.ps1 -Build
param([switch]$Build)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compose = Join-Path $root 'infra/docker-compose.yml'
$envFile = Join-Path $root '.env'

$composeArgs = @('-f', $compose, '--env-file', $envFile, 'up', '-d')
if ($Build) { $composeArgs += '--build' }

Write-Host "Ishga tushmoqda$(if ($Build) { ' (--build)' })..." -ForegroundColor Cyan
docker compose @composeArgs

Start-Sleep -Seconds 6
docker compose -f $compose ps --format "table {{.Name}}`t{{.Status}}"
Write-Host "`nDashboard: http://localhost:4300   (admin / Admin!2026)" -ForegroundColor Green
Write-Host "Gateway:   http://localhost:5080/health"
Write-Host "ML API:    http://localhost:8000/docs"

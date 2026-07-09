# Loglarni jonli ko'rsatadi. Bitta servis uchun: .\scripts\logs.ps1 gateway
# Servislar: timescaledb | redis | python-ml | dotnet-gateway | angular-nginx
param([string]$Service = '')
$ErrorActionPreference = 'Stop'
$compose = Join-Path (Split-Path $PSScriptRoot -Parent) 'infra/docker-compose.yml'
if ($Service) { docker compose -f $compose logs -f $Service }
else { docker compose -f $compose logs -f --tail 50 }

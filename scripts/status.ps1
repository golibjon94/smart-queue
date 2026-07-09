# Konteynerlar holatini ko'rsatadi.
$ErrorActionPreference = 'Stop'
$compose = Join-Path (Split-Path $PSScriptRoot -Parent) 'infra/docker-compose.yml'
docker compose -f $compose ps --format "table {{.Name}}`t{{.Status}}`t{{.Ports}}"

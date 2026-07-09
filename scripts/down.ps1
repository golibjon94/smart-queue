# Loyihani to'xtatadi. Ma'lumot saqlanadi.
# Ma'lumotni ham o'chirish (toza boshlash) uchun: .\scripts\down.ps1 -Wipe
param([switch]$Wipe)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compose = Join-Path $root 'infra/docker-compose.yml'

$composeArgs = @('-f', $compose, 'down')
if ($Wipe) {
  $composeArgs += '-v'
  Write-Host "DIQQAT: DB volume o'chiriladi (barcha ma'lumot yo'qoladi)." -ForegroundColor Yellow
}
docker compose @composeArgs
Write-Host "To'xtatildi." -ForegroundColor Green

# Demo ma'lumotini bugungacha yangilaydi + anomaliya in'ektsiya qiladi (surge + sekin kassa).
# Shart: stack ishlab turgan bo'lsin (.\scripts\up.ps1) va model mavjud bo'lsin.
# Model yo'q bo'lsa (toza klon) avval host'da o'qiting:
#   cd services/ml ; .\.venv\Scripts\python -m forecasting.train
$ErrorActionPreference = 'Stop'
$compose = Join-Path (Split-Path $PSScriptRoot -Parent) 'infra/docker-compose.yml'
$today = (Get-Date).ToString('yyyy-MM-dd')

Write-Host "1/3 Sintetik ma'lumot ($today gacha)..." -ForegroundColor Cyan
docker compose -f $compose exec -T python-ml python -m simulation.generate --end $today --replace
Write-Host "2/3 Bashorat (aktual bilan overlap)..." -ForegroundColor Cyan
docker compose -f $compose exec -T python-ml python -m forecasting.predict --overlap-hours 72 --hours 96 --replace
Write-Host "3/3 Demo anomaliya in'ektsiya..." -ForegroundColor Cyan
docker compose -f $compose exec -T python-ml python -m simulation.demo_seed

Write-Host "`nTayyor — dashboardda anomaliya paneli va yangi bashorat ko'rinadi." -ForegroundColor Green

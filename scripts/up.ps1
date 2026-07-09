# Loyihani ishga tushiradi (5 servis) va bo'sh bazani AVTOMATIK tiklaydi
# (migratsiya + admin + demo ma'lumot). Kod o'zgargan bo'lsa: .\scripts\up.ps1 -Build
param([switch]$Build)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compose = Join-Path $root 'infra/docker-compose.yml'
$envFile = Join-Path $root '.env'

function Compose { docker compose -f $compose @args }
function Psql([string]$sql) {
  (docker exec sq-timescaledb psql -U smartqueue -d smartqueue -tAc $sql 2>$null | Out-String).Trim()
}

# 1. Konteynerlarni ishga tushirish
$composeArgs = @('--env-file', $envFile, 'up', '-d')
if ($Build) { $composeArgs += '--build' }
Write-Host "Ishga tushmoqda$(if ($Build) { ' (--build)' })..." -ForegroundColor Cyan
Compose @composeArgs

# 2. DB tayyorligini kutish (compose healthcheck odatda kutadi, bu — qo'shimcha kafolat)
$deadline = (Get-Date).AddSeconds(60)
do {
  Start-Sleep -Seconds 2
  docker exec sq-timescaledb pg_isready -U smartqueue -d smartqueue *> $null
} until ($LASTEXITCODE -eq 0 -or (Get-Date) -gt $deadline)

# 3. Migratsiya + seed (idempotent — qo'llanganlari o'tkazib yuboriladi)
& (Join-Path $PSScriptRoot 'migrate.ps1') -Seed | Out-Null

# 4. Admin foydalanuvchi yo'q bo'lsa (yangi baza) — gateway'ni qayta ishga tushirib seed qildiramiz
if ((Psql "SELECT 1 FROM users WHERE username='admin'") -ne '1') {
  Write-Host "Admin yaratish uchun gateway qayta ishga tushirilmoqda..." -ForegroundColor Yellow
  Compose restart dotnet-gateway | Out-Null
  Start-Sleep -Seconds 5
}

# 5. Baza bo'sh bo'lsa — demo ma'lumot (navbat + bashorat + anomaliya)
if ((Psql "SELECT count(*) FROM queue_events") -eq '0') {
  if (Test-Path (Join-Path $root 'services/ml/models/latest.joblib')) {
    Write-Host "Bo'sh baza aniqlandi — demo ma'lumot yaratilmoqda (~1-2 daqiqa)..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'seed-demo.ps1')
  } else {
    Write-Host "Model yo'q — demo ma'lumot o'tkazib yuborildi." -ForegroundColor Yellow
    Write-Host "Avval host'da o'qiting: cd services\ml ; .\.venv\Scripts\python -m forecasting.train ; keyin .\scripts\seed-demo.ps1" -ForegroundColor Yellow
  }
}

# 6. Holat + manzillar
Compose ps --format "table {{.Name}}`t{{.Status}}"
Write-Host "`nDashboard: http://localhost:4300   (admin / Admin!2026)" -ForegroundColor Green
Write-Host "Gateway:   http://localhost:5080/health"
Write-Host "ML API:    http://localhost:8000/docs"

# Migratsiya skripti: db/migrations/*.sql fayllarini tartib bilan qo'llaydi.
# Qo'llanilganlar schema_migrations jadvalida qayd etiladi (takror qo'llanmaydi).
#
# Ishlatish:
#   .\scripts\migrate.ps1          # faqat migratsiyalar
#   .\scripts\migrate.ps1 -Seed    # migratsiyalar + db/seed/*.sql

param([switch]$Seed)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [Text.UTF8Encoding]::new($false)

$container = 'sq-timescaledb'
$db   = if ($env:POSTGRES_DB)   { $env:POSTGRES_DB }   else { 'smartqueue' }
$user = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'smartqueue' }

function Invoke-PsqlText([string]$sql) {
  $sql | docker exec -i $container psql -U $user -d $db -v ON_ERROR_STOP=1 -q
  if ($LASTEXITCODE -ne 0) { throw "psql xato: $sql" }
}

function Invoke-PsqlFile([string]$path) {
  Get-Content -Raw -Encoding UTF8 $path | docker exec -i $container psql -U $user -d $db -v ON_ERROR_STOP=1 -q
  if ($LASTEXITCODE -ne 0) { throw "Fayl qo'llashda xato: $path" }
}

Invoke-PsqlText "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());"

$root = Split-Path $PSScriptRoot -Parent

foreach ($f in (Get-ChildItem (Join-Path $root 'db\migrations\*.sql') | Sort-Object Name)) {
  $applied = docker exec $container psql -U $user -d $db -tAc "SELECT 1 FROM schema_migrations WHERE filename = '$($f.Name)'"
  if ($applied -eq '1') {
    Write-Host "SKIP  $($f.Name)" -ForegroundColor DarkGray
    continue
  }
  Write-Host "APPLY $($f.Name)" -ForegroundColor Cyan
  Invoke-PsqlFile $f.FullName
  Invoke-PsqlText "INSERT INTO schema_migrations (filename) VALUES ('$($f.Name)');"
}

if ($Seed) {
  foreach ($f in (Get-ChildItem (Join-Path $root 'db\seed\*.sql') | Sort-Object Name)) {
    Write-Host "SEED  $($f.Name)" -ForegroundColor Yellow
    Invoke-PsqlFile $f.FullName
  }
}

Write-Host "Tayyor." -ForegroundColor Green

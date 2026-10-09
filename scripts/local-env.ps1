# Dot-source from PowerShell: . ./scripts/local-env.ps1
# Configuration stays in ignored .env; no password is printed.
$projectDirectory = Split-Path -Parent $PSScriptRoot
$localConfiguration = @{}
Get-Content -LiteralPath (Join-Path $projectDirectory '.env') | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.*)$') { $localConfiguration[$matches[1]] = $matches[2] }
}
if (-not $localConfiguration['POSTGRES_PASSWORD'] -or -not $localConfiguration['APP_DB_PASSWORD']) {
  throw 'Create .env from .env.example with two distinct local passwords first.'
}
$ownerPassword = [Uri]::EscapeDataString($localConfiguration['POSTGRES_PASSWORD'])
$appPassword = [Uri]::EscapeDataString($localConfiguration['APP_DB_PASSWORD'])
$env:DATABASE_URL = "postgres://docuchat_app:${appPassword}@127.0.0.1:5433/docuextractochat"
$env:DATABASE_TEST_URL = "postgres://docuchat_owner:${ownerPassword}@127.0.0.1:5433/docuextractochat"
$env:STORAGE_DIR = Join-Path $projectDirectory 'data/documents'
$env:WEB_DIST_DIR = Join-Path $projectDirectory 'apps/web/dist'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'

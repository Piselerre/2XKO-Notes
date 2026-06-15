# Builds a portable ZIP (no installer, no admin). Extract and run "2XKO Notes.exe".
# Usage: .\scripts\build-portable.ps1
Set-Location $PSScriptRoot\..
$env:VITE_PORTABLE_BUILD = "1"

Set-Location apps\desktop
pnpm tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$conf = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
$ver = $conf.version
$releaseDir = "src-tauri/target/release"
$exe = Join-Path $releaseDir "2XKO Notes.exe"
if (-not (Test-Path $exe)) {
  Write-Error "Missing $exe"
  exit 1
}

$staging = Join-Path $releaseDir "portable-staging/2XKO Notes"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Force -Path $staging | Out-Null

Copy-Item $exe (Join-Path $staging "2XKO Notes.exe") -Force
$resources = Join-Path $releaseDir "resources"
if (Test-Path $resources) {
  Copy-Item $resources (Join-Path $staging "resources") -Recurse -Force
}
New-Item -ItemType File -Force -Path (Join-Path $staging ".portable") | Out-Null
@"
2XKO Notes v$ver (portable)

1. Extrae esta carpeta donde quieras (Escritorio, Documentos, USB...).
2. Ejecuta "2XKO Notes.exe". No pide admin ni instalacion.
3. Tus notas viven en Documentos\2XKO Notes\2xko-notes.sync.json
   (mueve tu archivo ahi si ya tenias datos de la beta).

Las actualizaciones futuras se aplican solas al reiniciar.
"@ | Set-Content -Path (Join-Path $staging "LEEME.txt") -Encoding UTF8

$distRoot = Join-Path $PSScriptRoot "..\dist-releases"
New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
$zipName = "2XKO.Notes_${ver}_x64-portable.zip"
$zipPath = Join-Path $distRoot $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $releaseDir "portable-staging/*") -DestinationPath $zipPath -Force

Set-Location $PSScriptRoot\..
Write-Host ""
Write-Host "Portable ZIP ready:"
Write-Host "  $zipPath"
Write-Host "  $((Get-Item $zipPath).Length) bytes"

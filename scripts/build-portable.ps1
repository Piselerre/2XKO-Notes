# Builds a portable ZIP (no installer, no admin). Use "Iniciar 2XKO Notes.bat" to launch.
# Usage: .\scripts\build-portable.ps1
Set-Location $PSScriptRoot\..
$env:VITE_PORTABLE_BUILD = "1"

function Find-SignTool {
  $cmd = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $sdk = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
    Sort-Object { $_.Directory.Parent.Name } -Descending |
    Select-Object -First 1
  if ($sdk) { return $sdk.FullName }
  return $null
}

function Sign-PortableExe {
  param([string]$Path)
  $signtool = Find-SignTool
  if (-not $signtool) {
    Write-Warning "signtool not found - exe will be unsigned."
    return
  }

  $cert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert -ErrorAction SilentlyContinue |
    Where-Object { $_.Subject -match 'PixelR' } |
    Select-Object -First 1

  if (-not $cert) {
    $cert = New-SelfSignedCertificate `
      -Type CodeSigningCert `
      -Subject "CN=PixelR, O=PixelR, L=Spain, C=ES" `
      -FriendlyName "2XKO Notes" `
      -CertStoreLocation Cert:\CurrentUser\My `
      -KeyExportPolicy Exportable `
      -KeyLength 2048 `
      -KeyAlgorithm RSA `
      -HashAlgorithm SHA256 `
      -NotAfter (Get-Date).AddYears(10)
  }

  & $signtool sign /fd SHA256 /sha1 $cert.Thumbprint /tr http://timestamp.digicert.com /td SHA256 /d "2XKO Notes" $Path
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "signtool sign failed (exit $LASTEXITCODE)."
  } else {
    Write-Host "Signed: $Path"
  }
}

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

Sign-PortableExe -Path $exe

$root = Join-Path $releaseDir "portable-staging"
if (Test-Path $root) { Remove-Item $root -Recurse -Force }
$appDir = Join-Path $root "2XKO Notes"
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

Copy-Item $exe (Join-Path $appDir "2XKO Notes.exe") -Force
$resources = Join-Path $releaseDir "resources"
if (Test-Path $resources) {
  Copy-Item $resources (Join-Path $appDir "resources") -Recurse -Force
}
New-Item -ItemType File -Force -Path (Join-Path $appDir ".portable") | Out-Null

$leeme = @"
2XKO Notes v$ver

USA SIEMPRE EL ARCHIVO:
  Iniciar 2XKO Notes.bat

Ese launcher quita el bloqueo de Windows (Mark-of-the-Web) antes de abrir la app.
No ejecutes el .exe directamente la primera vez.

Tus notas: Documentos\2XKO Notes\2xko-notes.sync.json
"@
Set-Content -Path (Join-Path $root "LEEME.txt") -Value $leeme -Encoding UTF8

$bat = @'
@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Quitando bloqueo de Windows en los archivos extraidos...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0' -Recurse -Force | Unblock-File -ErrorAction SilentlyContinue"
if exist "%~dp02XKO Notes\2XKO Notes.exe" (
  start "" "%~dp02XKO Notes\2XKO Notes.exe"
) else (
  echo No se encontro 2XKO Notes.exe. Extrae el ZIP completo.
  pause
)
'@
Set-Content -Path (Join-Path $root "Iniciar 2XKO Notes.bat") -Value $bat -Encoding ASCII

$distRoot = Join-Path $PSScriptRoot "..\dist-releases"
New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
$zipName = "2XKO.Notes_${ver}_x64-portable.zip"
$zipPath = Join-Path $distRoot $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $root "*") -DestinationPath $zipPath -Force

Set-Location $PSScriptRoot\..
Write-Host ""
Write-Host "Portable ZIP ready:"
Write-Host "  $zipPath"
Write-Host "  $((Get-Item $zipPath).Length) bytes"
Write-Host 'Launch via: Iniciar 2XKO Notes.bat'

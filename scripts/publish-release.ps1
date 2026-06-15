# Build portable zip and publish GitHub release on Piselerre/2XKO-Notes
param(
  [string]$Version = "0.5.0",
  [switch]$Replace
)

Set-Location $PSScriptRoot\..

Write-Host "Building portable zip..."
powershell -ExecutionPolicy Bypass -File scripts/build-portable.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node scripts/generate-latest-portable-json.mjs $Version
node scripts/verify-updates-channel.mjs

$zip = Join-Path "dist-releases" "2XKO.Notes_${Version}_x64-portable.zip"
if (-not (Test-Path $zip)) {
  Write-Error "Zip not found: $zip"
  exit 1
}

$notes = @"
## 2XKO Notes v$Version (portable)

1. Descarga el **.zip** y extrae todo.
2. Ejecuta **`Iniciar 2XKO Notes.bat`** (no el .exe directamente la primera vez).
   El .bat quita el bloqueo de SmartScreen/Defender antes de abrir la app.
3. Si Windows aun avisa la primera vez: **Mas informacion -> Ejecutar de todas formas** (solo una vez).
4. Notas en ``Documentos\2XKO Notes\2xko-notes.sync.json``
"@

$tag = "v$Version"
if ($Replace -or (gh release view $tag 2>$null)) {
  Write-Host "Replacing release $tag..."
  gh release delete $tag --yes 2>$null
}

Write-Host "Creating GitHub release $tag..."
gh release create $tag $zip --title "2XKO Notes v$Version (portable)" --notes $notes

if ($LASTEXITCODE -ne 0) {
  Write-Warning "gh release failed. Zip is ready at: $zip"
  exit 1
}

Write-Host "Published: https://github.com/Piselerre/2XKO-Notes/releases/tag/$tag"

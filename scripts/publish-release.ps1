# Build portable exe and publish GitHub release on Piselerre/2XKO-Notes
param(
  [string]$Version = "0.5.0",
  [switch]$Replace
)

Set-Location $PSScriptRoot\..

$PortableExeName = "2XKO.Notes_x64-portable.exe"

Write-Host "Building portable exe..."
powershell -ExecutionPolicy Bypass -File scripts/build-portable.ps1
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node scripts/generate-latest-portable-json.mjs $Version
node scripts/verify-updates-channel.mjs

$exe = Join-Path "dist-releases" $PortableExeName
if (-not (Test-Path $exe)) {
  Write-Error "Exe not found: $exe"
  exit 1
}

$notes = @"
## 2XKO Notes v$Version (portable)

Built with care for the competitive 2XKO scene.

1. Download **$PortableExeName**.
2. Run it from any folder (Desktop, Downloads, etc.).
3. Notes are stored in ``Documents\2XKO Notes\2xko-notes.sync.json``

Windows builds are signed with free code signing from SignPath Foundation.
See CODE_SIGNING_POLICY.md in the repository.
"@

$tag = "v$Version"
if ($Replace -or (gh release view $tag 2>$null)) {
  Write-Host "Replacing release $tag..."
  gh release delete $tag --yes 2>$null
}

Write-Host "Creating GitHub release $tag..."
gh release create $tag $exe --title "2XKO Notes v$Version (portable)" --notes $notes

if ($LASTEXITCODE -ne 0) {
  Write-Warning "gh release failed. Exe is ready at: $exe"
  exit 1
}

Write-Host "Published: https://github.com/Piselerre/2XKO-Notes/releases/tag/$tag"

# Build 2XKO Notes APK on Windows
#
# Requirements: JDK 21, Android SDK/NDK (see tauri android init), pnpm
# The project path must NOT contain spaces (NDK linker limitation).
#
# Output: dist-releases/2XKO-Notes-android.apk (signed, installable)

param(
  [string]$MirrorRoot = "C:\temp\2xko-notes"
)

$ErrorActionPreference = "Stop"
$source = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path $source)) { $source = "F:\2XKO Notas" }

Write-Host "Generating LogoApp launcher icons..."
Push-Location $source
node "$source\scripts\generate-android-icons.mjs" 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Icon generation failed." }
Pop-Location

Write-Host "Syncing to $MirrorRoot ..."
if (Test-Path $MirrorRoot) {
  robocopy $source $MirrorRoot /MIR /XD target .git "src-tauri\target" "apps\desktop\src-tauri\target" /NFL /NDL /NJH /NJS | Out-Null
} else {
  robocopy $source $MirrorRoot /E /XD target .git "src-tauri\target" "apps\desktop\src-tauri\target" /NFL /NDL /NJH /NJS | Out-Null
}

node "$MirrorRoot\scripts\sync-android-icons.mjs" 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Android icon sync failed." }

node "$MirrorRoot\scripts\sync-android-plugins.mjs" 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Android plugin sync failed." }

$sdkRoot = "$env:LOCALAPPDATA\Android\Sdk"
if (-not (Test-Path $sdkRoot)) { throw "Android SDK not found. Run: pnpm tauri android init" }

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$jdk21 = "C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot"
if (Test-Path $jdk21) {
  $env:JAVA_HOME = $jdk21
} elseif (-not $env:JAVA_HOME -or -not (Test-Path $env:JAVA_HOME)) {
  $javaExe = (Get-Command java -ErrorAction SilentlyContinue).Source
  if ($javaExe) {
    $env:JAVA_HOME = Split-Path (Split-Path $javaExe -Parent) -Parent
  }
}
$env:NDK_HOME = Get-ChildItem "$sdkRoot\ndk" | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName
$env:CI = "true"
$env:TAURI_ANDROID_NO_SYMLINKS = "true"
$env:Path = "$env:JAVA_HOME\bin;$sdkRoot\cmdline-tools\latest\bin;$sdkRoot\platform-tools;$env:NDK_HOME\toolchains\llvm\prebuilt\windows-x86_64\bin;$env:Path"

Push-Location $MirrorRoot
pnpm install 2>&1 | Out-Host
Pop-Location

Push-Location "$MirrorRoot\apps\desktop"
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
pnpm tauri android build --apk --target aarch64 2>&1 | Out-Host
$buildExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap

$so = "$MirrorRoot\apps\desktop\src-tauri\target\aarch64-linux-android\release\libx2ko_notes_lib.so"
$jni = "$MirrorRoot\apps\desktop\src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a"

function Invoke-GradleApk {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  node "$MirrorRoot\scripts\sync-android-icons.mjs" 2>&1 | Out-Host
  node "$MirrorRoot\scripts\sync-android-plugins.mjs" 2>&1 | Out-Host
  New-Item -ItemType Directory -Force -Path $jni | Out-Null
  Copy-Item -Force $so "$jni\libx2ko_notes_lib.so"
  Push-Location "$MirrorRoot\apps\desktop\src-tauri\gen\android"
  .\gradlew.bat assembleArm64Release -x rustBuildArm64Release 2>&1 | Out-Host
  $gradleExit = $LASTEXITCODE
  Pop-Location
  $ErrorActionPreference = $prevEap
  if ($gradleExit -ne 0) { throw "Gradle APK build failed." }
}

if ($buildExit -ne 0 -and (Test-Path $so)) {
  Write-Host "Tauri symlink step failed; continuing with JNI copy + Gradle fallback..."
  Invoke-GradleApk
} elseif ($buildExit -ne 0) {
  Pop-Location
  throw "Android Rust build failed."
} elseif (Test-Path $so) {
  Write-Host "Repackaging APK with synced Android plugins..."
  Invoke-GradleApk
}
Pop-Location

$apk = Get-ChildItem -Recurse "$MirrorRoot\apps\desktop\src-tauri\gen\android\app\build\outputs\apk" -Filter "*-unsigned.apk" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $apk) {
  $apk = Get-ChildItem -Recurse "$MirrorRoot\apps\desktop\src-tauri\gen\android\app\build\outputs\apk" -Filter "*.apk" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
if (-not $apk) { throw "APK not found after build." }

$buildTools = Get-ChildItem "$sdkRoot\build-tools" | Sort-Object Name -Descending | Select-Object -First 1
$apksigner = Join-Path $buildTools.FullName "apksigner.bat"
$debugKs = Join-Path $env:USERPROFILE ".android\debug.keystore"

if (-not (Test-Path $debugKs)) {
  Write-Host "Creating Android debug keystore..."
  $keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
  & $keytool -genkeypair -v `
    -keystore $debugKs `
    -storepass android `
    -alias androiddebugkey `
    -keypass android `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -dname "CN=Android Debug,O=Android,C=US" 2>&1 | Out-Host
}

$dest = Join-Path $source "dist-releases"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$unsignedOut = Join-Path $dest "2XKO-Notes-android-unsigned.apk"
$signedOut = Join-Path $dest "2XKO-Notes-android.apk"

Copy-Item $apk.FullName $unsignedOut -Force
Copy-Item $apk.FullName $signedOut -Force

& $apksigner sign `
  --ks $debugKs `
  --ks-pass pass:android `
  --key-pass pass:android `
  --out $signedOut `
  $unsignedOut 2>&1 | Out-Host

if ($LASTEXITCODE -ne 0) { throw "APK signing failed." }

& $apksigner verify --verbose $signedOut 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Signed APK verification failed." }

Write-Host "Signed APK ready: $signedOut"

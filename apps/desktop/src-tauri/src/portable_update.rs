use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]

fn install_dir() -> Result<PathBuf, String> {
    std::env::current_exe()
        .map_err(|e| e.to_string())
        .and_then(|p| p.parent().map(|d| d.to_path_buf()).ok_or_else(|| "invalid exe path".into()))
}

#[tauri::command]
pub fn download_file(url: String, dest: String) -> Result<(), String> {
    let bytes = reqwest::blocking::get(&url)
        .map_err(|e| e.to_string())?
        .bytes()
        .map_err(|e| e.to_string())?;
    if let Some(parent) = Path::new(&dest).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn apply_portable_exe_update(new_exe_path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let target_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let source = PathBuf::from(&new_exe_path);
        if !source.is_file() {
            return Err("update exe missing".into());
        }

        let pid = std::process::id();
        let stamp = chrono::Local::now().format("%Y%m%d%H%M%S");
        let script = std::env::temp_dir().join(format!("2xko-exe-update-{stamp}.ps1"));
        let script_body = format!(
            r#"
$ErrorActionPreference = 'Stop'
$src = '{src}'
$dst = '{dst}'
$pidToStop = {pid}
Start-Sleep -Seconds 1
Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {{ $_.ExecutablePath -and ($_.ExecutablePath -ieq $dst) }} |
  ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}
Start-Sleep -Milliseconds 500
Unblock-File -LiteralPath $src -ErrorAction SilentlyContinue
Copy-Item -LiteralPath $src -Destination $dst -Force
Unblock-File -LiteralPath $dst -ErrorAction SilentlyContinue
Start-Process -FilePath $dst
Remove-Item -LiteralPath '{script}' -Force -ErrorAction SilentlyContinue
"#,
            src = source.to_string_lossy().replace('\'', "''"),
            dst = target_exe.to_string_lossy().replace('\'', "''"),
            pid = pid,
            script = script.to_string_lossy().replace('\'', "''"),
        );
        fs::write(&script, script_body).map_err(|e| e.to_string())?;

        Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-WindowStyle",
                "Hidden",
                "-File",
                script.to_str().unwrap_or_default(),
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;

        std::thread::spawn(|| {
            std::thread::sleep(std::time::Duration::from_millis(250));
            std::process::exit(0);
        });

        return Ok(());
    }

    #[cfg(not(windows))]
    {
        let _ = new_exe_path;
        Err("portable exe updates are only supported on Windows".into())
    }
}

#[tauri::command]
pub fn apply_portable_zip_update(zip_path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let target = install_dir()?;
        let zip = PathBuf::from(&zip_path);
        if !zip.is_file() {
            return Err("update zip missing".into());
        }

        let stamp = chrono::Local::now().format("%Y%m%d%H%M%S");
        let extract_dir = std::env::temp_dir().join(format!("2xko-update-{stamp}"));
        if extract_dir.exists() {
            let _ = fs::remove_dir_all(&extract_dir);
        }
        fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let ps = format!(
            "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
            zip.to_string_lossy().replace('\'', "''"),
            extract_dir.to_string_lossy().replace('\'', "''")
        );
        let status = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &ps,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("failed to extract update zip".into());
        }

        let script = extract_dir.join("_apply_update.ps1");
        let inner = find_payload_dir(&extract_dir).unwrap_or_else(|| extract_dir.clone());
        let parent = target
            .parent()
            .map(|p| p.to_string_lossy().replace('\'', "''"))
            .unwrap_or_else(|| target.to_string_lossy().replace('\'', "''"));
        let extract_root = extract_dir.to_string_lossy().replace('\'', "''");
        let pid = std::process::id();
        let script_body = format!(
            r#"
$ErrorActionPreference = 'Stop'
$src = '{src}'
$dst = '{dst}'
$parent = '{parent}'
$extractRoot = '{extract_root}'
$pidToStop = {pid}
Start-Sleep -Seconds 1
Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {{ $_.ExecutablePath -and (($_.ExecutablePath -ieq $dst) -or ($_.ExecutablePath -like (Join-Path $dst '*'))) }} |
  ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }}
Start-Sleep -Milliseconds 500
Get-ChildItem -LiteralPath $extractRoot -Recurse -Force | Unblock-File -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $src '*') -Destination $dst -Recurse -Force
foreach ($name in @('README.txt')) {{
  $launcher = Join-Path $parent $name
  $from = Join-Path $extractRoot $name
  if (Test-Path $from) {{ Copy-Item -LiteralPath $from -Destination $launcher -Force }}
}}
Get-ChildItem -LiteralPath $dst -Recurse -Force | Unblock-File -ErrorAction SilentlyContinue
Get-ChildItem -LiteralPath $parent -Force -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
$exe = Join-Path $dst '2XKO Notes.exe'
if (Test-Path $exe) {{ Start-Process -FilePath $exe }}
Remove-Item -LiteralPath '{script}' -Force -ErrorAction SilentlyContinue
"#,
            src = inner.to_string_lossy().replace('\'', "''"),
            dst = target.to_string_lossy().replace('\'', "''"),
            parent = parent,
            extract_root = extract_root,
            pid = pid,
            script = script.to_string_lossy().replace('\'', "''"),
        );
        fs::write(&script, script_body).map_err(|e| e.to_string())?;

        Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-WindowStyle",
                "Hidden",
                "-File",
                script.to_str().unwrap_or_default(),
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| e.to_string())?;

        std::thread::spawn(|| {
            std::thread::sleep(std::time::Duration::from_millis(250));
            std::process::exit(0);
        });

        return Ok(());
    }

    #[cfg(not(windows))]
    {
        let _ = zip_path;
        Err("portable zip updates are only supported on Windows".into())
    }
}

fn find_payload_dir(root: &Path) -> Option<PathBuf> {
    let nested = root.join("2XKO Notes");
    if nested.join("2XKO Notes.exe").is_file() {
        return Some(nested);
    }
    let direct_exe = root.join("2XKO Notes.exe");
    if direct_exe.is_file() {
        return Some(root.to_path_buf());
    }
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if path.join("2XKO Notes.exe").is_file() {
                return Some(path);
            }
            if let Some(nested) = find_payload_dir(&path) {
                return Some(nested);
            }
        }
    }
    None
}

use std::path::Path;

#[cfg(windows)]
fn has_uninstall_registry() -> bool {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x08000000;
    const KEYS: &[&str] = &[
        r"HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall",
        r"HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall",
    ];

    for key in KEYS {
        let output = Command::new("reg")
            .args(["query", key])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
            if text.contains("2xko notes") || text.contains("com.x2ko.notes") {
                return true;
            }
        }
    }
    false
}

#[cfg(windows)]
fn is_nsis_install_dir(dir: &Path) -> bool {
    let path = dir.to_string_lossy().to_lowercase();
    path.contains("programs") && (path.contains("2xko") || path.contains("com.x2ko"))
}

pub fn detect_distribution_kind() -> &'static str {
    let Ok(exe) = std::env::current_exe() else {
        return "unknown";
    };
    let Some(dir) = exe.parent() else {
        return "unknown";
    };

    if dir.join(".portable").exists() {
        return "portable_zip";
    }

    #[cfg(windows)]
    {
        if is_nsis_install_dir(dir) || has_uninstall_registry() {
            return "legacy_installer";
        }
    }

    "unknown"
}

#[tauri::command]
pub fn get_distribution_kind() -> String {
    detect_distribution_kind().to_string()
}

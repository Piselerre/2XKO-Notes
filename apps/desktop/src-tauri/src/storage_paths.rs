use std::fs;

use std::path::{Path, PathBuf};



use tauri::{AppHandle, Manager};



pub const DATA_FILE: &str = "2xko-notes.sync.json";

pub const TOKENS_FILE: &str = "google_oauth_tokens.json";

pub const BACKUP_DIR: &str = "backups";

pub const RESTORE_ARCHIVE_DIR: &str = "restore-archive";

const BACKUP_INTERVAL_SECS: i64 = 300;

const BACKUP_RETENTION_DAYS: i64 = 30;



/// User notes live outside the app install folder so reinstall/uninstall does not wipe them.

pub fn notes_data_dir(app: &AppHandle) -> Result<PathBuf, String> {

    #[cfg(any(target_os = "android", target_os = "ios"))]

    {

        let dir = app.path().document_dir().map_err(|e| e.to_string())?.join("2XKO Notes");

        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        return Ok(dir);

    }



    #[cfg(not(any(target_os = "android", target_os = "ios")))]

    {

        let docs = app.path().document_dir().map_err(|e| e.to_string())?;

        let dir = docs.join("2XKO Notes");

        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        Ok(dir)

    }

}



pub fn data_file_path(app: &AppHandle) -> Result<PathBuf, String> {

    Ok(notes_data_dir(app)?.join(DATA_FILE))

}



pub fn tokens_file_path(app: &AppHandle) -> Result<PathBuf, String> {

    Ok(notes_data_dir(app)?.join(TOKENS_FILE))

}



pub fn backups_root(app: &AppHandle) -> Result<PathBuf, String> {

    let dir = notes_data_dir(app)?.join(BACKUP_DIR);

    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    Ok(dir)

}



fn legacy_app_data_dir(app: &AppHandle) -> Option<PathBuf> {

    app.path().app_data_dir().ok()

}



fn migrate_file_if_missing(app: &AppHandle, name: &str) -> Result<(), String> {

    let target = notes_data_dir(app)?.join(name);

    if target.exists() {

        return Ok(());

    }

    if let Some(legacy_dir) = legacy_app_data_dir(app) {

        let legacy_file = legacy_dir.join(name);

        if legacy_file.exists() {

            fs::copy(&legacy_file, &target).map_err(|e| e.to_string())?;

        }

    }

    Ok(())

}



pub fn ensure_storage_migrated(app: &AppHandle) -> Result<(), String> {

    migrate_file_if_missing(app, DATA_FILE)?;

    migrate_file_if_missing(app, TOKENS_FILE)?;

    let _ = backups_root(app)?;

    Ok(())

}



pub fn is_valid_sync_payload(content: &str) -> bool {

    let trimmed = content.trim();

    if trimmed.len() < 24 {

        return false;

    }

    trimmed.contains("\"schemaVersion\"") && trimmed.contains("\"data\"")

}



pub fn payload_revision(content: &str) -> u64 {

    let Ok(value) = serde_json::from_str::<serde_json::Value>(content) else {

        return 0;

    };

    value

        .pointer("/data/syncMeta/revision")

        .or_else(|| value.pointer("/syncMeta/revision"))

        .and_then(|v| v.as_u64())

        .unwrap_or(0)

}



pub fn write_atomic(path: &Path, content: &str) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "invalid data path".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;

    let tmp = path.with_extension("sync.json.tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;

    if fs::rename(&tmp, path).is_err() {
        fs::copy(&tmp, path).map_err(|e| e.to_string())?;
        let _ = fs::remove_file(&tmp);
    }
    Ok(())
}



fn latest_backup_in_day(day_dir: &Path) -> Option<PathBuf> {

    let mut files: Vec<PathBuf> = fs::read_dir(day_dir)

        .ok()?

        .filter_map(|e| e.ok())

        .map(|e| e.path())

        .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("json"))

        .collect();

    files.sort();

    files.pop()

}



fn should_create_dated_backup(day_dir: &Path) -> bool {

    let Some(latest) = latest_backup_in_day(day_dir) else {

        return true;

    };

    let Ok(meta) = fs::metadata(&latest) else {

        return true;

    };

    let Ok(modified) = meta.modified() else {

        return true;

    };

    let Ok(elapsed) = modified.elapsed() else {

        return true;

    };

    elapsed.as_secs() as i64 >= BACKUP_INTERVAL_SECS

}



pub fn create_dated_backup(app: &AppHandle, content: &str) -> Result<Option<String>, String> {

    let now = chrono::Local::now();

    let day_dir = backups_root(app)?.join(now.format("%Y-%m-%d").to_string());

    fs::create_dir_all(&day_dir).map_err(|e| e.to_string())?;



    if !should_create_dated_backup(&day_dir) {

        return Ok(None);

    }



    let filename = format!("{}.json", now.format("%H-%M-%S"));

    let backup_path = day_dir.join(&filename);

    fs::write(&backup_path, content).map_err(|e| e.to_string())?;

    prune_old_backups(app)?;

    Ok(Some(backup_path.to_string_lossy().to_string()))

}



fn prune_old_backups(app: &AppHandle) -> Result<(), String> {
    let root = backups_root(app)?;
    let cutoff_date = chrono::Local::now().date_naive() - chrono::Days::new(BACKUP_RETENTION_DAYS as u64);
    let cutoff_str = cutoff_date.format("%Y-%m-%d").to_string();
    let Ok(entries) = fs::read_dir(&root) else {
        return Ok(());
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
            continue;
        };
        if name < cutoff_str.as_str() && name != RESTORE_ARCHIVE_DIR {
            let _ = fs::remove_dir_all(&path);
        }
    }

    Ok(())

}



pub fn find_latest_backup(app: &AppHandle) -> Result<Option<PathBuf>, String> {

    let root = backups_root(app)?;

    let mut days: Vec<PathBuf> = fs::read_dir(&root)

        .map_err(|e| e.to_string())?

        .filter_map(|e| e.ok())

        .map(|e| e.path())

        .filter(|p| {
            p.is_dir()
                && p.file_name()
                    .and_then(|s| s.to_str())
                    .map(|n| n != RESTORE_ARCHIVE_DIR)
                    .unwrap_or(true)
        })

        .collect();

    days.sort();

    for day in days.into_iter().rev() {

        if let Some(file) = latest_backup_in_day(&day) {

            return Ok(Some(file));

        }

    }

    Ok(None)
}

pub fn load_backup_content(path: &Path) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct BackupEntry {
    pub path: String,
    pub display_name: String,
    pub folder: String,
    pub kind: String,
    pub size_bytes: u64,
    pub modified_iso: String,
}

fn backup_entry_from_path(path: &Path, kind: &str) -> Option<BackupEntry> {
    let meta = fs::metadata(path).ok()?;
    let modified = meta.modified().ok()?;
    let modified_iso = chrono::DateTime::<chrono::Utc>::from(modified).to_rfc3339();
    let display_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("backup.json")
        .to_string();
    let folder = path
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string();
    Some(BackupEntry {
        path: path.to_string_lossy().to_string(),
        display_name,
        folder,
        kind: kind.to_string(),
        size_bytes: meta.len(),
        modified_iso,
    })
}

fn collect_json_backups(dir: &Path, kind: &str, out: &mut Vec<BackupEntry>) -> Result<(), String> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Ok(());
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(item) = backup_entry_from_path(&path, kind) {
                out.push(item);
            }
        }
    }
    Ok(())
}

pub fn list_all_backups(app: &AppHandle) -> Result<Vec<BackupEntry>, String> {
    let root = backups_root(app)?;
    let mut items: Vec<BackupEntry> = Vec::new();

    let archive_dir = root.join(RESTORE_ARCHIVE_DIR);
    if archive_dir.is_dir() {
        collect_json_backups(&archive_dir, "pre_restore", &mut items)?;
    }

    let Ok(entries) = fs::read_dir(&root) else {
        return Ok(items);
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|s| s.to_str()) else {
            continue;
        };
        if name == RESTORE_ARCHIVE_DIR {
            continue;
        }
        collect_json_backups(&path, "dated", &mut items)?;
    }

    items.sort_by(|a, b| b.modified_iso.cmp(&a.modified_iso));
    Ok(items)
}

fn ensure_backup_path_allowed(app: &AppHandle, backup_path: &str) -> Result<PathBuf, String> {
    let root = backups_root(app)?;
    let path = PathBuf::from(backup_path);
    let canonical_root = fs::canonicalize(&root).unwrap_or(root);
    let canonical_path = fs::canonicalize(&path).map_err(|e| e.to_string())?;
    if !canonical_path.starts_with(&canonical_root) {
        return Err("Backup path is outside the backups folder.".into());
    }
    if canonical_path.extension().and_then(|s| s.to_str()) != Some("json") {
        return Err("Invalid backup file.".into());
    }
    Ok(canonical_path)
}

pub fn archive_current_data(app: &AppHandle) -> Result<Option<String>, String> {
    let data_path = data_file_path(app)?;
    if !data_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&data_path).map_err(|e| e.to_string())?;
    if content.trim().is_empty() || !is_valid_sync_payload(&content) {
        return Ok(None);
    }

    let archive_dir = backups_root(app)?.join(RESTORE_ARCHIVE_DIR);
    fs::create_dir_all(&archive_dir).map_err(|e| e.to_string())?;
    let filename = format!(
        "pre-restore-{}.json",
        chrono::Local::now().format("%Y-%m-%d_%H-%M-%S")
    );
    let archive_path = archive_dir.join(filename);
    fs::write(&archive_path, content).map_err(|e| e.to_string())?;
    Ok(Some(archive_path.to_string_lossy().to_string()))
}

pub fn restore_backup_file(app: &AppHandle, backup_path: &str) -> Result<String, String> {
    let path = ensure_backup_path_allowed(app, backup_path)?;
    let content = load_backup_content(&path)?;
    if !is_valid_sync_payload(&content) {
        return Err("Invalid backup payload.".into());
    }
    let data_path = data_file_path(app)?;
    write_atomic(&data_path, &content)?;
    Ok(data_path.to_string_lossy().to_string())
}

pub fn delete_backup_file(app: &AppHandle, backup_path: &str) -> Result<(), String> {
    let path = ensure_backup_path_allowed(app, backup_path)?;
    fs::remove_file(&path).map_err(|e| e.to_string())?;
    Ok(())
}

mod distribution;
mod google_drive;
mod portable_update;
mod storage_paths;

use std::fs;

use distribution::get_distribution_kind;
use google_drive::{
    drive_connect, drive_disconnect, drive_pull, drive_push, drive_status, GoogleDrivePullResult,
    GoogleDrivePushResult, GoogleDriveStatus,
};
use portable_update::{apply_portable_zip_update, download_file};
use storage_paths::{
    create_dated_backup, data_file_path, ensure_storage_migrated, find_latest_backup,
    is_valid_sync_payload, load_backup_content, payload_revision, write_atomic,
};

#[tauri::command]
fn save_data_file(app: tauri::AppHandle, content: String) -> Result<String, String> {
    ensure_storage_migrated(&app)?;
    if !is_valid_sync_payload(&content) {
        return Err("Refusing to save invalid or empty sync payload.".into());
    }

    let path = data_file_path(&app)?;
    let new_revision = payload_revision(&content);

    if path.exists() {
        if let Ok(existing) = fs::read_to_string(&path) {
            if !existing.trim().is_empty() && is_valid_sync_payload(&existing) {
                let old_revision = payload_revision(&existing);
                if new_revision == 0 && old_revision > 0 {
                    return Err("Refusing to overwrite notes with an empty revision.".into());
                }
            }
        }
    }

    write_atomic(&path, &content)?;
    let _ = create_dated_backup(&app, &content);
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_data_file_path(app: tauri::AppHandle) -> Result<String, String> {
    ensure_storage_migrated(&app)?;
    Ok(data_file_path(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn load_data_file(app: tauri::AppHandle) -> Result<String, String> {
    ensure_storage_migrated(&app)?;
    let path = data_file_path(&app)?;

    match fs::read_to_string(&path) {
        Ok(content) if is_valid_sync_payload(&content) => Ok(content),
        Ok(_) | Err(_) => {
            if let Some(backup) = find_latest_backup(&app)? {
                let restored = load_backup_content(&backup)?;
                if is_valid_sync_payload(&restored) {
                    write_atomic(&path, &restored)?;
                    return Ok(restored);
                }
            }
            match fs::read_to_string(&path) {
                Ok(content) => Ok(content),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
                Err(e) => Err(e.to_string()),
            }
        }
    }
}

#[tauri::command]
fn google_drive_status(app: tauri::AppHandle) -> Result<GoogleDriveStatus, String> {
    drive_status(&app)
}

#[tauri::command]
fn google_drive_connect(app: tauri::AppHandle) -> Result<String, String> {
    drive_connect(&app)
}

#[tauri::command]
fn google_drive_disconnect(app: tauri::AppHandle) -> Result<(), String> {
    drive_disconnect(&app)
}

#[tauri::command]
fn google_drive_pull(
    app: tauri::AppHandle,
    folder_id: Option<String>,
    file_id: Option<String>,
) -> Result<GoogleDrivePullResult, String> {
    drive_pull(&app, folder_id, file_id)
}

#[tauri::command]
fn google_drive_push(
    app: tauri::AppHandle,
    content: String,
    folder_id: Option<String>,
    file_id: Option<String>,
) -> Result<GoogleDrivePushResult, String> {
    drive_push(&app, content, folder_id, file_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
        .setup(|app| {
            let _ = ensure_storage_migrated(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_data_file,
            get_data_file_path,
            load_data_file,
            get_distribution_kind,
            download_file,
            apply_portable_zip_update,
            google_drive_status,
            google_drive_connect,
            google_drive_disconnect,
            google_drive_pull,
            google_drive_push,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

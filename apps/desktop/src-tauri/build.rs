use std::path::Path;

fn main() {
    let creds = Path::new("oauth_credentials.json");
    println!("cargo:rerun-if-changed=oauth_credentials.json");
    if !creds.exists() {
        let profile = std::env::var("PROFILE").unwrap_or_default();
        if profile == "release" {
            panic!(
                "oauth_credentials.json is required for release builds. Copy oauth_credentials.example.json and add your GCP client credentials."
            );
        }
        println!(
            "cargo:warning=oauth_credentials.json missing — Google Drive will not work in dev until you add it."
        );
    }
    tauri_build::build()
}

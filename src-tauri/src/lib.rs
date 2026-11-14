use std::path::Path;

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn probe_video_stream(app: AppHandle, file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.is_absolute() || file_path.contains('\r') || file_path.contains('\n') {
        return Err("The video path is invalid.".into());
    }

    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if extension != "mp4" && extension != "mov" {
        return Err("Only MP4 and MOV video streams can be probed.".into());
    }
    if !app.asset_protocol_scope().is_allowed(path) {
        return Err("The video is outside the selected folder's access scope.".into());
    }

    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|error| format!("Could not locate the FFmpeg sidecar: {error}"))?
        .args([
            "-hide_banner",
            "-loglevel",
            "info",
            "-nostdin",
            "-i",
            file_path.as_str(),
            "-map",
            "0:v:0",
            "-c:v",
            "copy",
            "-frames:v",
            "1",
            "-f",
            "null",
            "-",
        ])
        .output()
        .await
        .map_err(|error| format!("Could not probe the video stream: {error}"))?;

    let stream_info = String::from_utf8_lossy(&output.stderr).into_owned();
    if !output.status.success() {
        return Err(if stream_info.trim().is_empty() {
            "FFmpeg could not inspect the video stream.".into()
        } else {
            stream_info
        });
    }

    Ok(stream_info)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, probe_video_stream])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

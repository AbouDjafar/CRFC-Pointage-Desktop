use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

static LOG_PATH: OnceLock<Mutex<PathBuf>> = OnceLock::new();
static PANIC_HOOK_READY: OnceLock<()> = OnceLock::new();

pub fn init_runtime_logging() -> Option<PathBuf> {
    if let Some(path) = current_log_file() {
        install_panic_hook();
        return Some(path);
    }

    let mut selected_path = None;
    for candidate in log_candidates() {
        if ensure_log_file(&candidate).is_ok() {
            selected_path = Some(candidate);
            break;
        }
    }

    if let Some(path) = selected_path.clone() {
        let _ = LOG_PATH.set(Mutex::new(path.clone()));
        install_panic_hook();
        log_info("BOOT", &format!("Runtime logging initialized at {}", path.display()));
        selected_path
    } else {
        install_panic_hook();
        None
    }
}

pub fn current_log_file() -> Option<PathBuf> {
    LOG_PATH.get()?.lock().ok().map(|path| path.clone())
}

pub fn log_info(source: &str, message: &str) {
    append_line("INFO", source, message);
}

pub fn log_error(source: &str, message: &str) {
    append_line("ERROR", source, message);
}

pub fn log_frontend(level: &str, message: &str, details: Option<&str>) {
    let normalized_level = level.to_ascii_uppercase();
    append_line(&normalized_level, "FRONTEND", message);
    if let Some(extra) = details.filter(|value| !value.trim().is_empty()) {
        append_line(&normalized_level, "FRONTEND", extra);
    }
}

fn append_line(level: &str, source: &str, message: &str) {
    let Some(path) = current_log_file() else {
        return;
    };

    let timestamp = unix_timestamp();
    let sanitized = message.replace('\n', " | ");
    let line = format!("[{timestamp}] [{level}] [{source}] {sanitized}\n");

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = file.write_all(line.as_bytes());
    }
}

fn ensure_log_file(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

fn log_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("logs").join("crfc-pointage-desktop.log"));
        }
    }

    if let Some(local_data_dir) = dirs::data_local_dir() {
        candidates.push(
            local_data_dir
                .join("CRFC Pointage Desktop")
                .join("logs")
                .join("crfc-pointage-desktop.log"),
        );
    }

    candidates.push(
        std::env::temp_dir()
            .join("CRFC Pointage Desktop")
            .join("logs")
            .join("crfc-pointage-desktop.log"),
    );

    candidates
}

fn install_panic_hook() {
    if PANIC_HOOK_READY.set(()).is_err() {
        return;
    }

    let previous_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        log_error("PANIC", &panic_info.to_string());
        previous_hook(panic_info);
    }));
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

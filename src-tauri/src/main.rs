#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let log_path = crfc_pointage_desktop_lib::init_runtime_logging();
    if let Some(path) = log_path {
        crfc_pointage_desktop_lib::log_boot_info(&format!(
            "Executable bootstrap started. Log file: {}",
            path.display()
        ));
    }

    if let Err(error) = crfc_pointage_desktop_lib::run() {
        crfc_pointage_desktop_lib::log_boot_error(&format!(
            "Application terminated during startup: {error}"
        ));
    }
}

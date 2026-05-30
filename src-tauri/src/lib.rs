use dirs::document_dir;
use rfd::FileDialog;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct User {
    id: String,
    first_name: String,
    last_name: String,
    email: String,
    job_title: String,
    password: String,
    role: String,
    is_active: bool,
    created_at: String,
    created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Employee {
    id: String,
    full_name: String,
    first_name: String,
    last_name: String,
    is_active: bool,
    needs_review: bool,
    import_source: String,
    imported_at: String,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AbsenceReason {
    id: String,
    label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecurringAbsence {
    id: String,
    employee_id: String,
    reason_id: String,
    comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LateEntry {
    id: String,
    employee_id: String,
    employee_name_snapshot: Option<String>,
    arrival_time: String,
    minutes_late: i64,
    note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AbsenceEntry {
    id: String,
    employee_id: String,
    employee_name_snapshot: Option<String>,
    reason_id: String,
    comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DailyReport {
    id: String,
    date: String,
    status: String,
    late_entries: Vec<LateEntry>,
    absence_entries: Vec<AbsenceEntry>,
    visitor_count: i64,
    intro_text: String,
    created_by: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PickedImportFile {
    name: String,
    path: Option<String>,
    bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SaveRevealResult {
    path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    default_late_time: String,
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    Ok(app_data_dir.join("crfc-pointage.db"))
}

fn connect(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    let connection = Connection::open(path).map_err(|error| error.to_string())?;
    init_schema(&connection)?;
    Ok(connection)
}

fn init_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              first_name TEXT NOT NULL,
              last_name TEXT NOT NULL,
              email TEXT NOT NULL,
              job_title TEXT NOT NULL,
              password TEXT NOT NULL,
              role TEXT NOT NULL,
              is_active INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              created_by TEXT
            );
            CREATE TABLE IF NOT EXISTS employees (
              id TEXT PRIMARY KEY,
              full_name TEXT NOT NULL,
              first_name TEXT NOT NULL,
              last_name TEXT NOT NULL,
              is_active INTEGER NOT NULL,
              needs_review INTEGER NOT NULL,
              import_source TEXT NOT NULL,
              imported_at TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS absence_reasons (
              id TEXT PRIMARY KEY,
              label TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS reports (
              id TEXT PRIMARY KEY,
              date TEXT NOT NULL,
              status TEXT NOT NULL,
              visitor_count INTEGER NOT NULL,
              intro_text TEXT NOT NULL,
              created_by TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS late_entries (
              id TEXT PRIMARY KEY,
              report_id TEXT NOT NULL,
              employee_id TEXT NOT NULL,
              employee_name_snapshot TEXT,
              arrival_time TEXT NOT NULL,
              minutes_late INTEGER NOT NULL,
              note TEXT
            );
            CREATE TABLE IF NOT EXISTS absence_entries (
              id TEXT PRIMARY KEY,
              report_id TEXT NOT NULL,
              employee_id TEXT NOT NULL,
              employee_name_snapshot TEXT,
              reason_id TEXT NOT NULL,
              comment TEXT
            );
            CREATE TABLE IF NOT EXISTS recurring_absences (
              id TEXT PRIMARY KEY,
              employee_id TEXT NOT NULL,
              reason_id TEXT NOT NULL,
              comment TEXT
            );
        "#,
        )
        .map_err(|error| error.to_string())
}

fn save_json<T: Serialize>(connection: &Connection, key: &str, value: &T) -> Result<(), String> {
    let serialized = serde_json::to_string(value).map_err(|error| error.to_string())?;
    connection
        .execute(
            "INSERT INTO app_state (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, serialized],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn default_app_settings() -> AppSettings {
    AppSettings {
        default_late_time: "08:15".to_string(),
    }
}

fn load_string_state(connection: &Connection, key: &str) -> Result<Option<String>, String> {
    let mut statement = connection
        .prepare("SELECT value FROM app_state WHERE key = ?1")
        .map_err(|error| error.to_string())?;
    let result = statement.query_row([key], |row| row.get::<_, String>(0));
    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn load_session(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let connection = connect(&app)?;
    load_string_state(&connection, "session_user_id")
}

#[tauri::command]
fn save_session(app: tauri::AppHandle, user_id: String) -> Result<(), String> {
    let connection = connect(&app)?;
    connection
        .execute(
            "INSERT INTO app_state (key, value) VALUES ('session_user_id', ?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [user_id],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn clear_session(app: tauri::AppHandle) -> Result<(), String> {
    let connection = connect(&app)?;
    connection
        .execute("DELETE FROM app_state WHERE key = 'session_user_id'", [])
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let connection = connect(&app)?;
    let stored = load_string_state(&connection, "app_settings")?;
    if let Some(value) = stored {
        let settings = serde_json::from_str::<AppSettings>(&value).map_err(|error| error.to_string())?;
        Ok(settings)
    } else {
        let settings = default_app_settings();
        save_json(&connection, "app_settings", &settings)?;
        Ok(settings)
    }
}

#[tauri::command]
fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let connection = connect(&app)?;
    save_json(&connection, "app_settings", &settings)
}

#[tauri::command]
fn get_users(app: tauri::AppHandle) -> Result<Vec<User>, String> {
    let connection = connect(&app)?;
    let mut statement = connection
        .prepare("SELECT id, first_name, last_name, email, job_title, password, role, is_active, created_at, created_by FROM users ORDER BY created_at ASC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                first_name: row.get(1)?,
                last_name: row.get(2)?,
                email: row.get(3)?,
                job_title: row.get(4)?,
                password: row.get(5)?,
                role: row.get(6)?,
                is_active: row.get::<_, i64>(7)? == 1,
                created_at: row.get(8)?,
                created_by: row.get(9)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_users(app: tauri::AppHandle, users: Vec<User>) -> Result<(), String> {
    let mut connection = connect(&app)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction.execute("DELETE FROM users", []).map_err(|error| error.to_string())?;
    for user in users {
        transaction.execute(
            "INSERT INTO users (id, first_name, last_name, email, job_title, password, role, is_active, created_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![user.id, user.first_name, user.last_name, user.email, user.job_title, user.password, user.role, if user.is_active { 1 } else { 0 }, user.created_at, user.created_by],
        ).map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
fn get_employees(app: tauri::AppHandle) -> Result<Vec<Employee>, String> {
    let connection = connect(&app)?;
    let mut statement = connection
        .prepare("SELECT id, full_name, first_name, last_name, is_active, needs_review, import_source, imported_at, created_at FROM employees ORDER BY full_name ASC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(Employee {
                id: row.get(0)?,
                full_name: row.get(1)?,
                first_name: row.get(2)?,
                last_name: row.get(3)?,
                is_active: row.get::<_, i64>(4)? == 1,
                needs_review: row.get::<_, i64>(5)? == 1,
                import_source: row.get(6)?,
                imported_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_employees(app: tauri::AppHandle, employees: Vec<Employee>) -> Result<(), String> {
    let mut connection = connect(&app)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction.execute("DELETE FROM employees", []).map_err(|error| error.to_string())?;
    for employee in employees {
        transaction.execute(
            "INSERT INTO employees (id, full_name, first_name, last_name, is_active, needs_review, import_source, imported_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![employee.id, employee.full_name, employee.first_name, employee.last_name, if employee.is_active { 1 } else { 0 }, if employee.needs_review { 1 } else { 0 }, employee.import_source, employee.imported_at, employee.created_at],
        ).map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
fn get_absence_reasons(app: tauri::AppHandle) -> Result<Vec<AbsenceReason>, String> {
    let connection = connect(&app)?;
    let mut statement = connection
        .prepare("SELECT id, label FROM absence_reasons ORDER BY id ASC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| Ok(AbsenceReason { id: row.get(0)?, label: row.get(1)? }))
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_absence_reasons(app: tauri::AppHandle, reasons: Vec<AbsenceReason>) -> Result<(), String> {
    let mut connection = connect(&app)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction.execute("DELETE FROM absence_reasons", []).map_err(|error| error.to_string())?;
    for reason in reasons {
        transaction.execute("INSERT INTO absence_reasons (id, label) VALUES (?1, ?2)", params![reason.id, reason.label]).map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
fn get_recurring_absences(app: tauri::AppHandle) -> Result<Vec<RecurringAbsence>, String> {
    let connection = connect(&app)?;
    let mut statement = connection
        .prepare("SELECT id, employee_id, reason_id, comment FROM recurring_absences ORDER BY id ASC")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(RecurringAbsence {
                id: row.get(0)?,
                employee_id: row.get(1)?,
                reason_id: row.get(2)?,
                comment: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_recurring_absences(app: tauri::AppHandle, absences: Vec<RecurringAbsence>) -> Result<(), String> {
    let mut connection = connect(&app)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction.execute("DELETE FROM recurring_absences", []).map_err(|error| error.to_string())?;
    for absence in absences {
        transaction.execute("INSERT INTO recurring_absences (id, employee_id, reason_id, comment) VALUES (?1, ?2, ?3, ?4)", params![absence.id, absence.employee_id, absence.reason_id, absence.comment]).map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
fn get_reports(app: tauri::AppHandle) -> Result<Vec<DailyReport>, String> {
    let connection = connect(&app)?;
    let mut late_entries_by_report: HashMap<String, Vec<LateEntry>> = HashMap::new();
    let mut late_statement = connection.prepare("SELECT id, report_id, employee_id, employee_name_snapshot, arrival_time, minutes_late, note FROM late_entries").map_err(|error| error.to_string())?;
    let late_rows = late_statement.query_map([], |row| {
        Ok((row.get::<_, String>(1)?, LateEntry {
            id: row.get(0)?,
            employee_id: row.get(2)?,
            employee_name_snapshot: row.get(3)?,
            arrival_time: row.get(4)?,
            minutes_late: row.get(5)?,
            note: row.get(6)?,
        }))
    }).map_err(|error| error.to_string())?;
    for row in late_rows {
        let (report_id, entry) = row.map_err(|error| error.to_string())?;
        late_entries_by_report.entry(report_id).or_default().push(entry);
    }

    let mut absence_entries_by_report: HashMap<String, Vec<AbsenceEntry>> = HashMap::new();
    let mut absence_statement = connection.prepare("SELECT id, report_id, employee_id, employee_name_snapshot, reason_id, comment FROM absence_entries").map_err(|error| error.to_string())?;
    let absence_rows = absence_statement.query_map([], |row| {
        Ok((row.get::<_, String>(1)?, AbsenceEntry {
            id: row.get(0)?,
            employee_id: row.get(2)?,
            employee_name_snapshot: row.get(3)?,
            reason_id: row.get(4)?,
            comment: row.get(5)?,
        }))
    }).map_err(|error| error.to_string())?;
    for row in absence_rows {
        let (report_id, entry) = row.map_err(|error| error.to_string())?;
        absence_entries_by_report.entry(report_id).or_default().push(entry);
    }

    let mut statement = connection.prepare("SELECT id, date, status, visitor_count, intro_text, created_by, created_at, updated_at FROM reports ORDER BY date ASC").map_err(|error| error.to_string())?;
    let rows = statement.query_map([], |row| {
        let report_id: String = row.get(0)?;
        Ok(DailyReport {
            id: report_id.clone(),
            date: row.get(1)?,
            status: row.get(2)?,
            late_entries: late_entries_by_report.remove(&report_id).unwrap_or_default(),
            absence_entries: absence_entries_by_report.remove(&report_id).unwrap_or_default(),
            visitor_count: row.get(3)?,
            intro_text: row.get(4)?,
            created_by: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_reports(app: tauri::AppHandle, reports: Vec<DailyReport>) -> Result<(), String> {
    let mut connection = connect(&app)?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction.execute("DELETE FROM late_entries", []).map_err(|error| error.to_string())?;
    transaction.execute("DELETE FROM absence_entries", []).map_err(|error| error.to_string())?;
    transaction.execute("DELETE FROM reports", []).map_err(|error| error.to_string())?;
    for report in reports {
        transaction.execute(
            "INSERT INTO reports (id, date, status, visitor_count, intro_text, created_by, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![report.id, report.date, report.status, report.visitor_count, report.intro_text, report.created_by, report.created_at, report.updated_at],
        ).map_err(|error| error.to_string())?;
        for entry in report.late_entries {
            transaction.execute(
                "INSERT INTO late_entries (id, report_id, employee_id, employee_name_snapshot, arrival_time, minutes_late, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![entry.id, report.id, entry.employee_id, entry.employee_name_snapshot, entry.arrival_time, entry.minutes_late, entry.note],
            ).map_err(|error| error.to_string())?;
        }
        for entry in report.absence_entries {
            transaction.execute(
                "INSERT INTO absence_entries (id, report_id, employee_id, employee_name_snapshot, reason_id, comment) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![entry.id, report.id, entry.employee_id, entry.employee_name_snapshot, entry.reason_id, entry.comment],
            ).map_err(|error| error.to_string())?;
        }
    }
    transaction.commit().map_err(|error| error.to_string())
}

fn documents_target(subfolder: &str, file_name: &str) -> Result<PathBuf, String> {
    let base_dir = document_dir().ok_or_else(|| "Impossible de localiser le dossier Documents.".to_string())?;
    let folder = base_dir.join("CRFC Pointage").join(subfolder);
    fs::create_dir_all(&folder).map_err(|error| error.to_string())?;
    Ok(folder.join(file_name))
}

fn reveal_file(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let parent = path.parent().ok_or_else(|| "Parent introuvable.".to_string())?;
        Command::new("explorer")
            .arg(parent)
            .spawn()
            .map_err(|error| error.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        let parent = path.parent().ok_or_else(|| "Parent introuvable.".to_string())?;
        Command::new("open").arg(parent).spawn().map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn save_binary_and_reveal(subfolder: &str, file_name: &str, bytes: Vec<u8>) -> Result<SaveRevealResult, String> {
    let path = documents_target(subfolder, file_name)?;
    fs::write(&path, bytes).map_err(|error| error.to_string())?;
    reveal_file(&path)?;
    Ok(SaveRevealResult { path: path.to_string_lossy().to_string() })
}

#[tauri::command]
fn save_pdf_and_reveal(file_name: String, bytes: Vec<u8>) -> Result<SaveRevealResult, String> {
    save_binary_and_reveal("Rapports PDF", &file_name, bytes)
}

#[tauri::command]
fn save_excel_and_reveal(file_name: String, bytes: Vec<u8>) -> Result<SaveRevealResult, String> {
    save_binary_and_reveal("Syntheses Excel", &file_name, bytes)
}

#[tauri::command]
fn pick_import_file(extensions: Vec<String>) -> Result<Option<PickedImportFile>, String> {
    let mut dialog = FileDialog::new();
    for extension in extensions.iter().filter_map(|value| value.strip_prefix('.')) {
        dialog = dialog.add_filter(extension, &[extension]);
    }
    let file = dialog.pick_file();
    if let Some(path) = file {
        let name = path.file_name().and_then(|value| value.to_str()).ok_or_else(|| "Nom de fichier invalide.".to_string())?.to_string();
        let bytes = fs::read(&path).map_err(|error| error.to_string())?;
        Ok(Some(PickedImportFile { name, path: Some(path.to_string_lossy().to_string()), bytes }))
    } else {
        Ok(None)
    }
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let _ = connect(&app.handle());
            Ok(())
        })
        .on_page_load(|window, _payload| {
            let _ = window.show();
        })
        .invoke_handler(tauri::generate_handler![
            load_session,
            save_session,
            clear_session,
            get_users,
            save_users,
            get_employees,
            save_employees,
            get_absence_reasons,
            save_absence_reasons,
            get_reports,
            save_reports,
            get_recurring_absences,
            save_recurring_absences,
            get_app_settings,
            save_app_settings,
            pick_import_file,
            save_pdf_and_reveal,
            save_excel_and_reveal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

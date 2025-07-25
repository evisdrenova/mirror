use rusqlite::Connection;
use std::fs;
use std::io::{Error, ErrorKind};
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

type AppResult<T> = Result<T, Box<dyn std::error::Error>>;

/// Initialize the database and return the path to the created database file
pub fn init_database(app_handle: AppHandle) -> AppResult<std::path::PathBuf> {
    let app_data_dir: PathBuf = match app_handle.path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => {
            let error_msg = "Failed to get app data directory";
            eprintln!("{}", error_msg);
            return Err(Box::new(Error::new(ErrorKind::NotFound, error_msg)));
        }
    };

    if !app_data_dir.exists() {
        println!(
            "App data directory doesn't exist, creating: {:?}",
            app_data_dir
        );
        if let Err(e) = fs::create_dir_all(&app_data_dir) {
            let error_msg = format!("Failed to create app data directory: {}", e);
            eprintln!("{}", error_msg);
            return Err(Box::new(Error::new(ErrorKind::PermissionDenied, error_msg)));
        }
        println!("Created app data directory: {:?}", app_data_dir);
    }

    let db_path: PathBuf = app_data_dir.join("mirror.db");
    let db_exists = db_path.exists();

    if !db_exists {
        println!("Database doesn't exist, will be created at: {:?}", db_path);
    } else {
        println!("Database already exists at: {:?}", db_path);
    }

    let db_path: PathBuf = app_data_dir.join("mirror.db");

    let conn: Connection = match Connection::open(&db_path) {
        Ok(conn) => conn,
        Err(e) => {
            let error_msg = format!("Failed to open database connection: {}", e);
            eprintln!("{}", error_msg);
            return Err(Box::new(Error::new(ErrorKind::Other, error_msg)));
        }
    };

    let links_table = r#"
    create table if not exists clips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clip TEXT,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);"#;

    let statements = vec![links_table];

    for (i, stmt) in statements.iter().enumerate() {
        if let Err(e) = conn.execute(stmt, []) {
            let error_msg = format!("Error executing statement #{}: {}", i + 1, e);
            eprintln!("{}", error_msg);
            return Err(Box::new(Error::new(ErrorKind::Other, error_msg)));
        }
    }

    println!("Database initialized");
    Ok(db_path)
}

use rusqlite::Connection;
use std::sync::Mutex;
use crate::config::Config;

pub type Db = Mutex<Connection>;

pub fn init_connection(config: &Config) -> Result<Db, rusqlite::Error> {
    let conn = Connection::open(&config.db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    Ok(Mutex::new(conn))
}

use chrono::{DateTime, NaiveDate, Utc};
use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::{Entry, Settings, Standup, Task};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("daily_status_log.db");
        let conn = Connection::open(db_path)?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                date TEXT NOT NULL,
                content TEXT NOT NULL,
                tasks TEXT,
                blockers TEXT,
                synced_at TEXT
            );

            CREATE TABLE IF NOT EXISTS standups (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                date TEXT NOT NULL,
                content TEXT,
                entries_included TEXT,
                shared INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
            CREATE INDEX IF NOT EXISTS idx_standups_date ON standups(date);
            ",
        )?;
        Ok(())
    }

    pub fn create_entry(&self, entry: &Entry) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tasks_json = serde_json::to_string(&entry.tasks).unwrap_or_default();

        conn.execute(
            "INSERT INTO entries (id, created_at, date, content, tasks, blockers, synced_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                entry.id,
                entry.created_at.to_rfc3339(),
                entry.date.to_string(),
                entry.content,
                tasks_json,
                entry.blockers,
                entry.synced_at.map(|dt| dt.to_rfc3339()),
            ],
        )?;
        Ok(())
    }

    pub fn get_entry(&self, id: &str) -> Result<Option<Entry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, created_at, date, content, tasks, blockers, synced_at FROM entries WHERE id = ?1",
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(Self::row_to_entry(row))
        });

        match result {
            Ok(entry) => Ok(Some(entry)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_entries(&self, from_date: Option<NaiveDate>, to_date: Option<NaiveDate>) -> Result<Vec<Entry>> {
        let conn = self.conn.lock().unwrap();
        let mut entries = Vec::new();

        let (query, params_vec): (&str, Vec<String>) = match (from_date, to_date) {
            (Some(from), Some(to)) => (
                "SELECT id, created_at, date, content, tasks, blockers, synced_at FROM entries
                 WHERE date >= ?1 AND date <= ?2 ORDER BY date DESC, created_at DESC",
                vec![from.to_string(), to.to_string()],
            ),
            (Some(from), None) => (
                "SELECT id, created_at, date, content, tasks, blockers, synced_at FROM entries
                 WHERE date >= ?1 ORDER BY date DESC, created_at DESC",
                vec![from.to_string()],
            ),
            (None, Some(to)) => (
                "SELECT id, created_at, date, content, tasks, blockers, synced_at FROM entries
                 WHERE date <= ?1 ORDER BY date DESC, created_at DESC",
                vec![to.to_string()],
            ),
            (None, None) => (
                "SELECT id, created_at, date, content, tasks, blockers, synced_at FROM entries
                 ORDER BY date DESC, created_at DESC",
                vec![],
            ),
        };

        let mut stmt = conn.prepare(query)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        let rows = stmt.query_map(params_refs.as_slice(), |row| Ok(Self::row_to_entry(row)))?;

        for row in rows {
            entries.push(row?);
        }

        Ok(entries)
    }

    pub fn delete_entry(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows_affected = conn.execute("DELETE FROM entries WHERE id = ?1", params![id])?;
        Ok(rows_affected > 0)
    }

    pub fn create_standup(&self, standup: &Standup) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let entries_json = serde_json::to_string(&standup.entries_included).unwrap_or_default();

        conn.execute(
            "INSERT INTO standups (id, created_at, date, content, entries_included, shared)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                standup.id,
                standup.created_at.to_rfc3339(),
                standup.date.to_string(),
                standup.content,
                entries_json,
                standup.shared as i32,
            ],
        )?;
        Ok(())
    }

    pub fn get_last_shared_standup(&self) -> Result<Option<Standup>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, created_at, date, content, entries_included, shared
             FROM standups WHERE shared = 1 ORDER BY created_at DESC LIMIT 1",
        )?;

        let result = stmt.query_row([], |row| Ok(Self::row_to_standup(row)));

        match result {
            Ok(standup) => Ok(Some(standup)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn mark_standup_shared(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let rows_affected = conn.execute(
            "UPDATE standups SET shared = 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(rows_affected > 0)
    }

    pub fn get_settings(&self) -> Result<Settings> {
        let conn = self.conn.lock().unwrap();
        let mut settings = Settings::default();

        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        })?;

        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "reminder_enabled" => settings.reminder_enabled = value == "true",
                "reminder_time" => settings.reminder_time = value,
                "standup_format" => settings.standup_format = value,
                "ai_enabled" => settings.ai_enabled = value == "true",
                "ollama_model" => settings.ollama_model = value,
                "sync_enabled" => settings.sync_enabled = value == "true",
                "sync_url" => settings.sync_url = value,
                "sync_api_key" => settings.sync_api_key = value,
                _ => {}
            }
        }

        Ok(settings)
    }

    pub fn update_settings(&self, settings: &Settings) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('reminder_enabled', ?1)",
            params![settings.reminder_enabled.to_string()],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('reminder_time', ?1)",
            params![settings.reminder_time],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('standup_format', ?1)",
            params![settings.standup_format],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_enabled', ?1)",
            params![settings.ai_enabled.to_string()],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('ollama_model', ?1)",
            params![settings.ollama_model],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_enabled', ?1)",
            params![settings.sync_enabled.to_string()],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_url', ?1)",
            params![settings.sync_url],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('sync_api_key', ?1)",
            params![settings.sync_api_key],
        )?;

        Ok(())
    }

    pub fn upsert_entry(&self, entry: &Entry) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let tasks_json = serde_json::to_string(&entry.tasks).unwrap_or_default();

        conn.execute(
            "INSERT OR REPLACE INTO entries (id, created_at, date, content, tasks, blockers, synced_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                entry.id,
                entry.created_at.to_rfc3339(),
                entry.date.to_string(),
                entry.content,
                tasks_json,
                entry.blockers,
                entry.synced_at.map(|dt| dt.to_rfc3339()),
            ],
        )?;
        Ok(())
    }

    pub fn update_entry_synced_at(&self, id: &str, synced_at: DateTime<Utc>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE entries SET synced_at = ?1 WHERE id = ?2",
            params![synced_at.to_rfc3339(), id],
        )?;
        Ok(())
    }

    pub fn get_unsynced_entries(&self) -> Result<Vec<Entry>> {
        let conn = self.conn.lock().unwrap();
        let mut entries = Vec::new();

        let mut stmt = conn.prepare(
            "SELECT id, created_at, date, content, tasks, blockers, synced_at
             FROM entries WHERE synced_at IS NULL ORDER BY created_at ASC"
        )?;

        let rows = stmt.query_map([], |row| Ok(Self::row_to_entry(row)))?;

        for row in rows {
            entries.push(row?);
        }

        Ok(entries)
    }

    pub fn get_all_entries(&self) -> Result<Vec<Entry>> {
        self.get_entries(None, None)
    }

    fn row_to_entry(row: &rusqlite::Row) -> Entry {
        let id: String = row.get(0).unwrap_or_default();
        let created_at_str: String = row.get(1).unwrap_or_default();
        let date_str: String = row.get(2).unwrap_or_default();
        let content: String = row.get(3).unwrap_or_default();
        let tasks_json: String = row.get(4).unwrap_or_default();
        let blockers: Option<String> = row.get(5).ok();
        let synced_at_str: Option<String> = row.get(6).ok();

        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
            .unwrap_or_else(|_| Utc::now().date_naive());

        let tasks: Vec<Task> = serde_json::from_str(&tasks_json).unwrap_or_default();

        let synced_at = synced_at_str.and_then(|s| {
            DateTime::parse_from_rfc3339(&s)
                .map(|dt| dt.with_timezone(&Utc))
                .ok()
        });

        Entry {
            id,
            created_at,
            date,
            content,
            tasks,
            blockers,
            synced_at,
        }
    }

    pub fn search_entries(
        &self,
        from_date: Option<NaiveDate>,
        to_date: Option<NaiveDate>,
        query: Option<&str>,
        completed_only: bool,
        in_progress_only: bool,
        has_blockers: bool,
    ) -> Result<Vec<Entry>> {
        let conn = self.conn.lock().unwrap();
        let mut entries = Vec::new();

        // Build the base query
        let mut sql = String::from(
            "SELECT id, created_at, date, content, tasks, blockers, synced_at FROM entries WHERE 1=1"
        );
        let mut params_vec: Vec<String> = Vec::new();

        if let Some(from) = from_date {
            sql.push_str(&format!(" AND date >= ?{}", params_vec.len() + 1));
            params_vec.push(from.to_string());
        }

        if let Some(to) = to_date {
            sql.push_str(&format!(" AND date <= ?{}", params_vec.len() + 1));
            params_vec.push(to.to_string());
        }

        if let Some(q) = query {
            if !q.trim().is_empty() {
                sql.push_str(&format!(" AND (content LIKE ?{} OR tasks LIKE ?{})", params_vec.len() + 1, params_vec.len() + 2));
                let like_pattern = format!("%{}%", q);
                params_vec.push(like_pattern.clone());
                params_vec.push(like_pattern);
            }
        }

        if has_blockers {
            sql.push_str(" AND blockers IS NOT NULL AND blockers != ''");
        }

        sql.push_str(" ORDER BY date DESC, created_at DESC");

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();

        let rows = stmt.query_map(params_refs.as_slice(), |row| Ok(Self::row_to_entry(row)))?;

        for row in rows {
            let entry = row?;

            // Apply task filters in memory (can't easily do JSON filtering in SQLite)
            if completed_only {
                let all_completed = entry.tasks.iter().all(|t| t.completed);
                if !all_completed || entry.tasks.is_empty() {
                    continue;
                }
            }

            if in_progress_only {
                let has_incomplete = entry.tasks.iter().any(|t| !t.completed);
                if !has_incomplete {
                    continue;
                }
            }

            entries.push(entry);
        }

        Ok(entries)
    }

    fn row_to_standup(row: &rusqlite::Row) -> Standup {
        let id: String = row.get(0).unwrap_or_default();
        let created_at_str: String = row.get(1).unwrap_or_default();
        let date_str: String = row.get(2).unwrap_or_default();
        let content: String = row.get(3).unwrap_or_default();
        let entries_json: String = row.get(4).unwrap_or_default();
        let shared: i32 = row.get(5).unwrap_or(0);

        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
            .unwrap_or_else(|_| Utc::now().date_naive());

        let entries_included: Vec<String> = serde_json::from_str(&entries_json).unwrap_or_default();

        Standup {
            id,
            created_at,
            date,
            content,
            entries_included,
            shared: shared != 0,
        }
    }
}

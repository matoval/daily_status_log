use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::models::{Entry, Settings, Task};
use crate::storage::Database;

#[derive(Debug, Serialize)]
struct CreateEntryRequest {
    id: String,
    created_at: DateTime<Utc>,
    date: chrono::NaiveDate,
    content: String,
    tasks: Vec<Task>,
    blockers: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SyncResponse {
    entries: Vec<RemoteEntry>,
    synced_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct RemoteEntry {
    id: String,
    created_at: DateTime<Utc>,
    date: chrono::NaiveDate,
    content: String,
    tasks: Vec<Task>,
    blockers: Option<String>,
    synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
struct UploadResponse {
    synced_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncResult {
    pub uploaded: usize,
    pub downloaded: usize,
    pub errors: Vec<String>,
}

impl From<&Entry> for CreateEntryRequest {
    fn from(entry: &Entry) -> Self {
        CreateEntryRequest {
            id: entry.id.clone(),
            created_at: entry.created_at,
            date: entry.date,
            content: entry.content.clone(),
            tasks: entry.tasks.clone(),
            blockers: entry.blockers.clone(),
        }
    }
}

impl From<RemoteEntry> for Entry {
    fn from(remote: RemoteEntry) -> Self {
        Entry {
            id: remote.id,
            created_at: remote.created_at,
            date: remote.date,
            content: remote.content,
            tasks: remote.tasks,
            blockers: remote.blockers,
            synced_at: remote.synced_at,
        }
    }
}

pub async fn sync_entries(db: &Database, settings: &Settings) -> Result<SyncResult, String> {
    if !settings.sync_enabled {
        return Err("Sync is not enabled".to_string());
    }

    if settings.sync_url.is_empty() {
        return Err("Sync URL is not configured".to_string());
    }

    if settings.sync_api_key.is_empty() {
        return Err("Sync API key is not configured".to_string());
    }

    let client = Client::new();
    let base_url = settings.sync_url.trim_end_matches('/');
    let mut result = SyncResult {
        uploaded: 0,
        downloaded: 0,
        errors: Vec::new(),
    };

    // Step 1: Upload local unsynced entries
    let unsynced = db.get_unsynced_entries().map_err(|e| e.to_string())?;

    if !unsynced.is_empty() {
        let requests: Vec<CreateEntryRequest> = unsynced.iter().map(|e| e.into()).collect();

        let response = client
            .post(format!("{}/api/entries/bulk", base_url))
            .header("x-api-key", &settings.sync_api_key)
            .json(&requests)
            .timeout(std::time::Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| format!("Failed to upload entries: {}", e))?;

        if response.status().is_success() {
            let upload_result: UploadResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse upload response: {}", e))?;

            // Mark entries as synced
            for entry in &unsynced {
                if let Err(e) = db.update_entry_synced_at(&entry.id, upload_result.synced_at) {
                    result.errors.push(format!("Failed to update sync status for {}: {}", entry.id, e));
                } else {
                    result.uploaded += 1;
                }
            }
        } else {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            result.errors.push(format!("Upload failed: {} - {}", status, text));
        }
    }

    // Step 2: Download remote entries
    let response = client
        .get(format!("{}/api/entries", base_url))
        .header("x-api-key", &settings.sync_api_key)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch entries: {}", e))?;

    if response.status().is_success() {
        let sync_response: SyncResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse sync response: {}", e))?;

        // Get local entry IDs to check for new entries
        let local_entries = db.get_all_entries().map_err(|e| e.to_string())?;
        let local_ids: std::collections::HashSet<String> = local_entries.iter().map(|e| e.id.clone()).collect();

        for remote_entry in sync_response.entries {
            let entry: Entry = remote_entry.into();

            // Only download entries we don't have locally
            if !local_ids.contains(&entry.id) {
                if let Err(e) = db.upsert_entry(&entry) {
                    result.errors.push(format!("Failed to save entry {}: {}", entry.id, e));
                } else {
                    result.downloaded += 1;
                }
            }
        }
    } else {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        result.errors.push(format!("Download failed: {} - {}", status, text));
    }

    Ok(result)
}

pub async fn test_connection(url: &str, api_key: &str) -> Result<bool, String> {
    let client = Client::new();
    let base_url = url.trim_end_matches('/');

    let response = client
        .get(format!("{}/health", base_url))
        .header("x-api-key", api_key)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    Ok(response.status().is_success())
}

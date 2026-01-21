use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{delete, get, post},
    Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// ============================================================================
// Models
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub text: String,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub date: NaiveDate,
    pub content: String,
    pub tasks: Vec<Task>,
    pub blockers: Option<String>,
    pub synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEntryRequest {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub date: NaiveDate,
    pub content: String,
    pub tasks: Vec<Task>,
    pub blockers: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SinceQuery {
    pub since: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub entries: Vec<Entry>,
    pub synced_at: DateTime<Utc>,
}

// ============================================================================
// Database
// ============================================================================

async fn init_db(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL,
            date DATE NOT NULL,
            content TEXT NOT NULL,
            tasks JSONB NOT NULL DEFAULT '[]',
            blockers TEXT,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            api_key TEXT NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create index for efficient sync queries
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_entries_synced_at ON entries(synced_at)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_entries_api_key ON entries(api_key)
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

// ============================================================================
// App State
// ============================================================================

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}

// ============================================================================
// Authentication
// ============================================================================

/// Hash an API key using SHA-256 for secure storage
fn hash_api_key(api_key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(api_key.as_bytes());
    hex::encode(hasher.finalize())
}

fn extract_api_key(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

fn validate_api_key(api_key: &str) -> bool {
    // Simple validation: API key must be at least 16 characters
    api_key.len() >= 16
}

// ============================================================================
// Handlers
// ============================================================================

async fn health_check() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

async fn get_entries(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(query): Query<SinceQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let api_key = extract_api_key(&headers)
        .ok_or((StatusCode::UNAUTHORIZED, "Missing API key".to_string()))?;

    if !validate_api_key(&api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let api_key_hash = hash_api_key(&api_key);

    let entries: Vec<(String, DateTime<Utc>, NaiveDate, String, serde_json::Value, Option<String>, DateTime<Utc>)> =
        if let Some(since) = query.since {
            sqlx::query_as(
                r#"
                SELECT id, created_at, date, content, tasks, blockers, synced_at
                FROM entries
                WHERE api_key = $1 AND synced_at > $2
                ORDER BY created_at DESC
                "#,
            )
            .bind(&api_key_hash)
            .bind(since)
            .fetch_all(&state.pool)
            .await
        } else {
            sqlx::query_as(
                r#"
                SELECT id, created_at, date, content, tasks, blockers, synced_at
                FROM entries
                WHERE api_key = $1
                ORDER BY created_at DESC
                "#,
            )
            .bind(&api_key_hash)
            .fetch_all(&state.pool)
            .await
        }
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let entries: Vec<Entry> = entries
        .into_iter()
        .map(|(id, created_at, date, content, tasks, blockers, synced_at)| Entry {
            id,
            created_at,
            date,
            content,
            tasks: serde_json::from_value(tasks).unwrap_or_default(),
            blockers,
            synced_at: Some(synced_at),
        })
        .collect();

    Ok(Json(SyncResponse {
        entries,
        synced_at: Utc::now(),
    }))
}

async fn create_entry(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(entry): Json<CreateEntryRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let api_key = extract_api_key(&headers)
        .ok_or((StatusCode::UNAUTHORIZED, "Missing API key".to_string()))?;

    if !validate_api_key(&api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let api_key_hash = hash_api_key(&api_key);

    let tasks_json = serde_json::to_value(&entry.tasks)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let synced_at = Utc::now();

    // Upsert: insert or update if exists
    sqlx::query(
        r#"
        INSERT INTO entries (id, created_at, date, content, tasks, blockers, synced_at, api_key)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            tasks = EXCLUDED.tasks,
            blockers = EXCLUDED.blockers,
            synced_at = EXCLUDED.synced_at
        "#,
    )
    .bind(&entry.id)
    .bind(entry.created_at)
    .bind(entry.date)
    .bind(&entry.content)
    .bind(&tasks_json)
    .bind(&entry.blockers)
    .bind(synced_at)
    .bind(&api_key_hash)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({ "synced_at": synced_at })),
    ))
}

async fn delete_entry(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let api_key = extract_api_key(&headers)
        .ok_or((StatusCode::UNAUTHORIZED, "Missing API key".to_string()))?;

    if !validate_api_key(&api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let api_key_hash = hash_api_key(&api_key);

    let result = sqlx::query(
        r#"
        DELETE FROM entries WHERE id = $1 AND api_key = $2
        "#,
    )
    .bind(&id)
    .bind(&api_key_hash)
    .execute(&state.pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Entry not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

async fn upload_entries(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(entries): Json<Vec<CreateEntryRequest>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let api_key = extract_api_key(&headers)
        .ok_or((StatusCode::UNAUTHORIZED, "Missing API key".to_string()))?;

    if !validate_api_key(&api_key) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    let api_key_hash = hash_api_key(&api_key);
    let synced_at = Utc::now();

    for entry in entries {
        let tasks_json = serde_json::to_value(&entry.tasks)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

        sqlx::query(
            r#"
            INSERT INTO entries (id, created_at, date, content, tasks, blockers, synced_at, api_key)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                tasks = EXCLUDED.tasks,
                blockers = EXCLUDED.blockers,
                synced_at = EXCLUDED.synced_at
            "#,
        )
        .bind(&entry.id)
        .bind(entry.created_at)
        .bind(entry.date)
        .bind(&entry.content)
        .bind(&tasks_json)
        .bind(&entry.blockers)
        .bind(synced_at)
        .bind(&api_key_hash)
        .execute(&state.pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(serde_json::json!({ "synced_at": synced_at })))
}

// ============================================================================
// Main
// ============================================================================

#[tokio::main]
async fn main() {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "daily_status_log_server=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Database connection
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/daily_status_log".into());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Initialize database schema
    init_db(&pool).await.expect("Failed to initialize database");

    tracing::info!("Database initialized");

    let state = Arc::new(AppState { pool });

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/entries", get(get_entries))
        .route("/api/entries", post(create_entry))
        .route("/api/entries/bulk", post(upload_entries))
        .route("/api/entries/{id}", delete(delete_entry))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("Starting server on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

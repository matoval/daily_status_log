# Daily Status Log - Sync Server

A self-hosted sync server for Daily Status Log. Enables multi-device sync of your work entries.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/daily-status-log.git
cd daily-status-log/server

# Start the server
docker compose up -d
```

The server will be available at `http://your-server:21435`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@db:5432/daily_status_log` | PostgreSQL connection |
| `PORT` | `21435` | Server port |
| `RUST_LOG` | `daily_status_log_server=info,tower_http=info` | Log level |

### Customizing

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings

3. For production, update `docker-compose.yml`:
   - Change `POSTGRES_PASSWORD` to a secure password
   - Update `DATABASE_URL` to match

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/entries` | Get all entries |
| POST | `/api/entries` | Create entry |
| POST | `/api/entries/bulk` | Bulk upload entries |
| DELETE | `/api/entries/{id}` | Delete entry |

All endpoints (except `/health`) require the `x-api-key` header.

## Authentication

The server uses API key authentication:

- Each user creates their own API key (16+ characters minimum)
- API key is sent in the `x-api-key` header
- Entries are isolated by API key (each key sees only its own data)

There is no central user management - each device uses the same API key to share data.

## Security Recommendations

### For Production

1. **Use HTTPS** - Put behind a reverse proxy (nginx, Caddy) with TLS
2. **Strong API keys** - Use long, random API keys (32+ characters recommended)
3. **Firewall** - Restrict access to trusted networks
4. **Backup** - Regular PostgreSQL backups

### Example nginx configuration

```nginx
server {
    listen 443 ssl;
    server_name sync.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:21435;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Data Storage

- PostgreSQL database with automatic schema creation
- Data persisted in Docker volume `postgres_data`
- Backup with: `docker compose exec db pg_dump -U postgres daily_status_log > backup.sql`

## Logs

View server logs:

```bash
docker compose logs -f server
```

## Updating

```bash
git pull
docker compose up -d --build
```

## Troubleshooting

### Server won't start

Check logs:
```bash
docker compose logs server
```

### Database connection issues

Ensure PostgreSQL is healthy:
```bash
docker compose ps
docker compose logs db
```

### API key errors

- Verify key is 16+ characters
- Check `x-api-key` header is being sent
- Ensure no extra whitespace in key

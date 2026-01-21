# Daily Status Log

A cross-platform desktop application for tracking daily work status with AI-powered chat assistance and optional multi-device sync.

## Features

- **Daily Entry Logging** - Track tasks, progress, and blockers
- **AI Chat Assistant** - Query past entries, generate standup reports (powered by local Ollama)
- **Standup Reports** - Generate formatted reports for standups (Markdown, Slack, plain text)
- **Multi-Device Sync** - Optional sync to your own server
- **Local-First** - All data stored locally by default, no cloud required
- **System Tray** - Runs in background with configurable daily reminders

## Quick Start

### Download

Download the latest release for your platform:

| Platform | Download |
|----------|----------|
| Linux (AppImage) | [Download](#) |
| Linux (RPM) | [Download](#) |
| macOS (DMG) | [Download](#) |

### Linux (AppImage)

```bash
chmod +x Daily-Status-Log-*.AppImage
./Daily-Status-Log-*.AppImage
```

### Linux (RPM)

```bash
sudo rpm -i daily-status-log-*.rpm
```

### macOS

1. Open the `.dmg` file
2. Drag "Daily Status Log" to Applications
3. Open from Applications (right-click → Open on first launch)

## Usage

### Creating Entries

1. Click "New Entry" or use the entry form
2. Add a description of what you worked on
3. Add tasks with their completion status
4. Optionally add blockers
5. Click "Save Entry"

### AI Chat

Click "AI Chat" to open the chat panel. You can ask:

- "What did I work on last week?"
- "Generate a standup report"
- "Find tasks related to API"

The AI runs locally using Ollama (bundled with the app) - no internet required.

### Standup Reports

1. Open the Standup Report panel
2. Review the generated report (includes entries since last standup)
3. Edit if needed
4. Click "Copy to Clipboard"
5. Paste into Slack, Teams, or email

### Settings

Access Settings to configure:

- **Reminder Time** - Daily notification time
- **Standup Format** - Markdown, Slack, or plain text
- **AI Model** - Ollama model for chat
- **Remote Sync** - Enable multi-device sync

## Multi-Device Sync (Optional)

Sync your entries across devices using your own server.

### Server Setup

1. Clone this repository on your server
2. Deploy with Docker:

```bash
cd server
docker compose up -d
```

3. Server runs on port `21435` by default

### Configure Desktop App

1. Open Settings → Remote Sync
2. Enable "Enable remote sync"
3. Enter your server URL (e.g., `http://192.168.1.100:21435`)
4. Enter an API key (16+ characters, you create this)
5. Click "Test Connection"
6. Save Settings

Sync happens automatically on app startup and after creating entries.

## Building from Source

### Prerequisites

- Node.js 18+
- Rust 1.70+
- Platform-specific dependencies (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Production Build

```bash
# Build for current platform
npm run tauri build
```

Outputs are in `src-tauri/target/release/bundle/`.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2 (Rust)
- **Database**: SQLite (local), PostgreSQL (sync server)
- **AI**: Ollama with qwen2.5:1.5b model (bundled)
- **Sync Server**: Rust + Axum + Docker

## Privacy

- All data stored locally by default
- AI runs locally (no cloud APIs)
- Optional sync uses your own server
- No telemetry or analytics

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

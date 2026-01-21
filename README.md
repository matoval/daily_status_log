# Daily Status Log

A cross-platform desktop application for tracking daily work status and generating standup reports. Built with Tauri 2.x, React, and TypeScript.

## Features

- **Entry Management** - Log daily status updates with tasks and blockers
- **Task Tracking** - Mark tasks as completed or in-progress
- **Standup Reports** - Generate reports from entries since your last standup
- **System Tray** - Runs in background, minimizes to tray
- **Daily Reminders** - Configurable notification at your preferred time (weekdays)
- **Copy to Clipboard** - One-click copy of standup reports
- **Dark Mode** - Automatic system theme support
- **Local Storage** - All data stored locally in SQLite

## Screenshots

```
+------------------------------------------+
|  Daily Status Log              [Settings]|
+------------------------------------------+
|  [+ New Entry]  [Generate Standup]       |
+------------------------------------------+
|  Today                                   |
|  +------------------------------------+  |
|  | 10:30 AM          2/3 tasks    [x] |  |
|  +------------------------------------+  |
|                                          |
|  Recent                                  |
|  Mon, Jan 20 (2 entries)                 |
|  +------------------------------------+  |
|  | 5:00 PM           1/2 tasks    [x] |  |
|  +------------------------------------+  |
+------------------------------------------+
```

## Prerequisites

### Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### System Dependencies (Fedora/RHEL)

```bash
sudo dnf install -y webkit2gtk4.1-devel openssl-devel librsvg2-devel libappindicator-gtk3-devel
```

### System Dependencies (Ubuntu/Debian)

```bash
sudo apt install -y libwebkit2gtk-4.1-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev
```

### Node.js

Node.js 18+ is required. Install via your package manager or [nvm](https://github.com/nvm-sh/nvm).

## Installation

```bash
# Clone the repository
git clone https://github.com/matoval/daily_status_log.git
cd daily-status-log

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

## Building

```bash
# Build for production
npm run tauri build

# The built application will be in:
# src-tauri/target/release/bundle/
```

## Usage

### Creating Entries

1. Click **+ New Entry** button
2. Describe what you worked on
3. Add tasks (press Enter or click Add)
4. Mark tasks as completed if done
5. Add any blockers (optional)
6. Click **Save Entry**

### Generating Standup Reports

1. Click **Generate Standup** button
2. Review the generated report (entries since last standup)
3. Edit if needed
4. Click **Copy to Clipboard & Save**
5. Paste into Slack, Teams, or your standup tool

### Daily Reminders

1. Open **Settings**
2. Enable daily reminder
3. Set your preferred reminder time
4. The app will notify you on weekdays at that time

### System Tray

- Close the window to minimize to tray (app keeps running)
- Click the tray icon to reopen the window
- Right-click the tray icon for menu options
- Select **Quit** to fully exit the application

## Configuration

Settings are stored in the app and include:

| Setting | Description | Default |
|---------|-------------|---------|
| Reminder Enabled | Toggle daily reminders | On |
| Reminder Time | Time for daily notification | 09:00 |
| Standup Format | Output format for reports | Markdown |

## Data Storage

All data is stored locally in SQLite:

- **Linux**: `~/.local/share/com.msandova.daily-status-log/`
- **macOS**: `~/Library/Application Support/com.msandova.daily-status-log/`
- **Windows**: `%APPDATA%\com.msandova.daily-status-log\`

## Development

### Project Structure

```
daily-status-log/
├── src-tauri/           # Rust backend
│   ├── src/
│   │   ├── lib.rs       # App setup, tray, window management
│   │   ├── commands.rs  # Tauri commands (API)
│   │   ├── models.rs    # Data structures
│   │   ├── storage.rs   # SQLite operations
│   │   └── scheduler.rs # Daily reminder scheduling
│   └── Cargo.toml
├── src/                 # React frontend
│   ├── components/      # UI components
│   ├── lib/tauri.ts     # Tauri API wrappers
│   ├── App.tsx
│   └── App.css
└── package.json
```

### Tech Stack

- **Backend**: Rust + Tauri 2.x
- **Frontend**: React 19 + TypeScript + Vite
- **Database**: SQLite (via rusqlite)
- **Styling**: CSS with dark mode support

## Roadmap

See [SPEC.md](./SPEC.md) for detailed specification.

### Phase 1: MVP (Completed)
- [x] Entry form with tasks
- [x] SQLite storage
- [x] System tray
- [x] Daily reminders
- [x] Standup report generation
- [x] Copy to clipboard

### Phase 2: Enhanced Features
- [ ] AI integration (Ollama) for conversational logging
- [ ] Query past entries
- [ ] Export (JSON, CSV, Markdown)

### Phase 3: Sync & Multi-Platform
- [ ] Remote sync server
- [ ] macOS/Windows builds
- [ ] Multi-device sync

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

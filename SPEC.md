# Daily Status Log - Application Specification

## Overview

A cross-platform desktop application that uses AI to interactively collect daily work status updates from users and stores them for future reference and reporting.

## Core Features

### 1. AI-Powered Chat Interface
- **Scheduled Prompts**: App triggers a chat window at a configurable time (e.g., end of workday)
- **Natural Conversation**: AI asks follow-up questions to gather complete status information
- **Context Awareness**: AI remembers previous entries for continuity
- **Report Generation**: Users can query past entries and generate summaries

### 2. Data Storage
- **Local Storage**: SQLite database on user's machine (default)
- **Remote Storage**: Optional sync to a self-hosted server
- **Export**: Ability to export data in various formats (JSON, CSV, Markdown)

### 3. Standup Report Generation
See `STANDUP_FEATURE.md` for detailed specification.
- **Smart Date Range**: Automatically includes entries since last standup
- **Editable Preview**: Review and edit before copying
- **Multiple Formats**: Markdown, plain text, Slack formatting
- **Quick Copy**: One-click copy to clipboard for pasting into chat tools

### 4. Cross-Platform Support
- Primary: Linux (initial release)
- Secondary: macOS (future release)
- Potential: Windows (if needed)

## User Stories

1. As a user, I want to be reminded at 5pm to log my daily work
2. As a user, I want the AI to ask clarifying questions about my tasks
3. As a user, I want to query "What did I work on last week?"
4. As a user, I want to generate weekly/monthly summary reports
5. As a user, I want my data stored locally by default for privacy
6. As a user, I want to optionally sync data to my own server
7. As a user, I want to generate standup reports that include work since my last standup
8. As a user, I want to copy my standup report to clipboard for pasting into Slack/Teams

## Technical Requirements

### Application Framework
See `TECH_STACK.md` for detailed comparison.

**Recommended: Tauri + React/Vue**
- Lightweight (~10MB vs Electron's 150MB+)
- Native system tray support
- Cross-platform (Linux, macOS, Windows)
- Rust backend for performance and security
- Web frontend for rapid UI development

### Local AI Integration
See `LOCAL_AI_MODELS.md` for detailed comparison.

**Recommended: Ollama + Llama 3.2 3B or Phi-3-mini**
- Runs on CPU with acceptable performance
- Small enough for desktop deployment
- Capable enough for conversational task logging
- Ollama provides easy model management

### Data Storage

**Local Database: SQLite**
```
entries/
  - id (UUID)
  - timestamp (datetime)
  - raw_conversation (JSON)
  - extracted_tasks (JSON array)
  - tags (array)
  - summary (text)

settings/
  - reminder_time
  - ai_model
  - sync_enabled
  - sync_server_url
```

**Remote Sync Server (Optional)**
- Simple REST API
- Authentication via API key or OAuth
- PostgreSQL backend for multi-user support

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Desktop Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Tauri     │  │   Web UI    │  │   System Tray       │  │
│  │   (Rust)    │  │ React/Vue   │  │   + Notifications   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                    Core Services                       │  │
│  ├───────────────┬───────────────┬───────────────────────┤  │
│  │  AI Service   │  Storage Svc  │  Scheduler Service    │  │
│  │  (Ollama)     │  (SQLite)     │  (Cron-like)          │  │
│  └───────────────┴───────────────┴───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Optional Sync)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Remote Server                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  REST API   │  │  PostgreSQL │  │  Authentication     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## AI Conversation Flow

### Daily Status Collection
```
AI: "Hey! It's end of day. What did you work on today?"
User: "Worked on the API refactor"
AI: "Got it! Did you complete it or is it still in progress?"
User: "Still in progress, about 70% done"
AI: "Any blockers or things you need help with tomorrow?"
User: "Need to sync with the backend team about the schema changes"
AI: "Perfect. I've logged: API refactor (70%, in progress),
     blocker: need backend team sync on schema. Anything else?"
User: "That's it"
AI: "Great work! See you tomorrow."
```

### Report Query
```
User: "What did I work on last week?"
AI: "Last week (Jan 13-17) you worked on:
     - API refactor (ongoing, 70% → completed)
     - Bug fix for login issue (completed Wed)
     - Team meeting notes (Thursday)
     Want me to generate a detailed report?"
```

## System Prompt for AI

```
You are a friendly work status assistant. Your job is to:
1. Help the user log what they worked on today
2. Ask clarifying questions to get complete information
3. Extract structured data: task name, status, blockers, notes
4. Keep conversations brief and friendly
5. When asked, generate reports from past entries

Guidelines:
- Be conversational but efficient
- Don't be overly formal or robotic
- Ask follow-up questions if responses are vague
- Confirm what you've logged before ending
- For reports, be concise but complete
```

## Development Phases

### Phase 1: MVP (Linux) - COMPLETED
- [x] Basic Tauri app with entry form UI
- [x] SQLite storage for entries and standups
- [x] System tray with daily reminder notifications
- [x] Standup report generation (since last standup)
- [x] Copy to clipboard functionality
- [x] Configurable reminder time (weekdays only)

### Phase 2: Enhanced Features - COMPLETED
- [x] AI Chat integration with bundled Ollama (qwen2.5:1.5b model)
- [x] Ollama auto-starts with app and stops on exit (port 11435)
- [x] Auto-pull of AI model on first run
- [x] Query past entries via AI chat (standup reports, task search)
- [x] Export functionality (JSON, CSV, Markdown)
- [x] Entry search with date range and text filtering
- [x] Multiple standup formats (Markdown, Slack, plain text)

### Phase 3: Sync & Multi-Platform
- [ ] Remote sync server
- [ ] macOS build
- [ ] Multi-device sync

## File Structure

```
daily-status-log/
├── src-tauri/              # Rust backend
│   ├── binaries/
│   │   └── ollama-*        # Bundled Ollama binaries (per platform)
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # App setup, tray, window management
│   │   ├── commands.rs     # Tauri commands (API endpoints)
│   │   ├── models.rs       # Data structures (Entry, Task, Standup, Settings)
│   │   ├── storage.rs      # SQLite database operations
│   │   ├── scheduler.rs    # Daily reminder scheduling
│   │   ├── ollama.rs       # Ollama integration (server start/stop, chat API)
│   │   ├── export.rs       # Export functionality (JSON, CSV, Markdown)
│   │   └── sync.rs         # Remote sync (Phase 3)
│   ├── capabilities/
│   │   └── default.json    # Tauri permissions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # Frontend (React + TypeScript)
│   ├── components/
│   │   ├── EntryForm.tsx   # Form to create entries with tasks
│   │   ├── EntryList.tsx   # Display entries grouped by date
│   │   ├── StandupReport.tsx # Generate & copy standup reports
│   │   ├── Settings.tsx    # App settings modal
│   │   ├── Chat.tsx        # AI chat panel
│   │   ├── ExportModal.tsx # Export UI with format selection
│   │   └── EntrySearch.tsx # Search/filter UI
│   ├── lib/
│   │   ├── tauri.ts        # TypeScript wrappers for Tauri commands
│   │   ├── ollama.ts       # Ollama status and chat functions
│   │   ├── export.ts       # Export functionality
│   │   └── search.ts       # Search functionality
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── server/                 # Optional sync server (Phase 3)
│   ├── src/
│   └── Cargo.toml
├── package.json
├── tsconfig.json
└── SPEC.md
```

## Dependencies

### Desktop App
- Tauri 2.x with tauri-plugin-shell (for sidecar support)
- React 18 + TypeScript
- SQLite (via rusqlite)
- Ollama (bundled as sidecar binary)

### AI Requirements
- Ollama bundled with app (no separate installation needed)
- Model: qwen2.5:1.5b (auto-pulled on first run, ~1GB)
- Runs on CPU only for maximum compatibility
- RAM: 2-4GB recommended for 1.5B model
- Dedicated port 11435 to avoid conflicts

### Sync Server (Optional)
- Rust + Axum/Actix
- PostgreSQL
- Docker for deployment

## Configuration

Settings are stored in SQLite and managed via the Settings UI:

```json
{
  "reminder_enabled": true,
  "reminder_time": "17:00",
  "standup_format": "markdown",
  "ai_enabled": false,
  "ollama_model": "qwen2.5:1.5b"
}
```

- **reminder_enabled**: Show daily reminder notifications
- **reminder_time**: Time for reminder (HH:MM format)
- **standup_format**: Default format for standups (markdown, plain, slack)
- **ai_enabled**: Reserved for future use
- **ollama_model**: AI model for chat (auto-pulled if not available)

## Security Considerations

1. **Local-first**: All data stays on device by default
2. **Encrypted sync**: TLS for server communication
3. **API key auth**: Simple but secure sync authentication
4. **No telemetry**: No data sent to third parties
5. **AI runs locally**: No cloud AI APIs used

## Success Metrics

- App startup time < 2 seconds
- AI response time < 5 seconds on CPU
- Memory usage < 500MB (app only, excluding AI model)
- Daily reminder reliability > 99%

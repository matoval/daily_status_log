import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { EntryForm } from "./components/EntryForm";
import { EntryList } from "./components/EntryList";
import { Settings } from "./components/Settings";
import { Chat } from "./components/Chat";
import { getEntries, getSettings, syncEntries, Entry, SyncResult } from "./lib/tauri";

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const loaded = await getEntries();
      setEntries(loaded);
    } catch (error) {
      console.error("Failed to load entries:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSyncSettings = useCallback(async () => {
    try {
      const settings = await getSettings();
      setSyncEnabled(settings.sync_enabled && !!settings.sync_url && !!settings.sync_api_key);
    } catch (error) {
      console.error("Failed to load sync settings:", error);
    }
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const result: SyncResult = await syncEntries();
      const messages = [];
      if (result.uploaded > 0) messages.push(`${result.uploaded} uploaded`);
      if (result.downloaded > 0) messages.push(`${result.downloaded} downloaded`);
      if (result.errors.length > 0) messages.push(`${result.errors.length} errors`);
      setSyncStatus(messages.length > 0 ? messages.join(", ") : "Already in sync");
      if (result.downloaded > 0) {
        loadEntries();
      }
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus("Sync failed");
      console.error("Sync failed:", error);
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadEntries();
    loadSyncSettings();
  }, [loadEntries, loadSyncSettings]);

  return (
    <main className="app">
      <header className="app-header">
        <h1>Daily Status Log</h1>
        <div className="header-actions">
          {syncEnabled && (
            <>
              <button
                className="sync-btn"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? "Syncing..." : "Sync"}
              </button>
              {syncStatus && <span className="sync-status">{syncStatus}</span>}
            </>
          )}
          <button
            className={`chat-btn ${showChat ? "active" : ""}`}
            onClick={() => setShowChat(!showChat)}
          >
            {showChat ? "Close Chat" : "AI Chat"}
          </button>
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            Settings
          </button>
        </div>
      </header>

      <div className="app-layout">
        <div className={`app-main ${showChat ? "with-chat" : ""}`}>
          <div className="app-actions">
            <EntryForm onEntryCreated={loadEntries} />
          </div>

          <div className="app-content">
            {isLoading ? (
              <p className="loading">Loading entries...</p>
            ) : (
              <EntryList entries={entries} onEntryDeleted={loadEntries} />
            )}
          </div>
        </div>

        {showChat && (
          <div className="chat-panel">
            <Chat onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>

      {showSettings && <Settings onClose={() => { setShowSettings(false); loadSyncSettings(); }} />}
    </main>
  );
}

export default App;

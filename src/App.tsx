import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { EntryForm } from "./components/EntryForm";
import { EntryList } from "./components/EntryList";
import { Settings } from "./components/Settings";
import { Chat } from "./components/Chat";
import { getEntries, Entry } from "./lib/tauri";

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return (
    <main className="app">
      <header className="app-header">
        <h1>Daily Status Log</h1>
        <div className="header-actions">
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

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </main>
  );
}

export default App;

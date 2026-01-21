import { useState, useEffect, useRef, useCallback } from "react";
import { getSettings, Settings } from "../lib/tauri";
import { checkOllamaStatus, chatWithAI, OllamaStatus } from "../lib/ollama";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatProps {
  onClose: () => void;
}

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;

export function Chat({ onClose }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isStartingOllama, setIsStartingOllama] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);

  const loadSettingsAndStatus = useCallback(async (isRetry = false) => {
    if (!isRetry) {
      setIsCheckingStatus(true);
      setIsStartingOllama(false);
      retryCountRef.current = 0;
    }
    try {
      const [loadedSettings, status] = await Promise.all([
        getSettings(),
        checkOllamaStatus(),
      ]);
      setSettings(loadedSettings);
      setOllamaStatus(status);

      // If Ollama isn't available and we haven't exhausted retries, try again
      if (!status.available && retryCountRef.current < MAX_RETRIES) {
        setIsStartingOllama(true);
        retryCountRef.current += 1;
        setTimeout(() => {
          loadSettingsAndStatus(true);
        }, RETRY_DELAY_MS);
        return;
      }

      setIsStartingOllama(false);
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("Failed to initialize chat");
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsAndStatus();
  }, [loadSettingsAndStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatWithAI(userMessage.content, settings.ollama_model);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setError("Failed to get response. Make sure Ollama is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetryConnection = () => {
    loadSettingsAndStatus();
  };

  if (isCheckingStatus || isStartingOllama) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h2>AI Chat</h2>
          <button className="close-btn" onClick={onClose}>
            x
          </button>
        </div>
        <div className="chat-loading">
          <p>{isStartingOllama ? "Starting Ollama..." : "Connecting to Ollama..."}</p>
          {isStartingOllama && (
            <p className="hint">This may take a few seconds on first launch</p>
          )}
        </div>
      </div>
    );
  }

  if (!ollamaStatus?.available) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h2>AI Chat</h2>
          <button className="close-btn" onClick={onClose}>
            x
          </button>
        </div>
        <div className="chat-unavailable">
          <p>Ollama is not running.</p>
          <p className="hint">
            Make sure Ollama is installed. You can download it from{" "}
            <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">
              ollama.ai
            </a>
          </p>
          <button onClick={handleRetryConnection}>Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Chat</h2>
        <span className="chat-model">Using: {settings?.ollama_model}</span>
        <button className="close-btn" onClick={onClose}>
          x
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>Ask me about your work entries!</p>
            <p className="hint">Try asking:</p>
            <ul>
              <li>"Generate a standup report"</li>
              <li>"What did I work on last week?"</li>
              <li>"When did I complete the login feature?"</li>
              <li>"Summarize my blockers"</li>
            </ul>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message assistant loading">
            <div className="message-content">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && <p className="chat-error">{error}</p>}

      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your entries..."
          rows={2}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          Send
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  StandupReport as StandupReportType,
  generateStandup,
  saveStandup,
  copyToClipboard,
} from "../lib/tauri";

interface StandupReportProps {
  onClose: () => void;
}

export function StandupReport({ onClose }: StandupReportProps) {
  const [report, setReport] = useState<StandupReportType | null>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const generated = await generateStandup();
      setReport(generated);
      setContent(generated.content);
    } catch (err) {
      setError("Failed to generate standup report");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAndSave = async () => {
    if (!report) return;

    try {
      await copyToClipboard(content);
      await saveStandup(
        report.id,
        content,
        report.entries.map((e) => e.id)
      );
      setIsCopied(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError("Failed to copy or save standup");
      console.error(err);
    }
  };

  if (!report && !isLoading) {
    return (
      <div className="standup-modal">
        <div className="standup-content">
          <div className="standup-header">
            <h2>Generate Standup Report</h2>
            <button className="close-btn" onClick={onClose}>
              x
            </button>
          </div>
          <p>
            Generate a standup report from your entries since your last shared
            standup.
          </p>
          <div className="standup-actions">
            <button onClick={loadReport}>Generate Report</button>
            <button onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="standup-modal">
      <div className="standup-content">
        <div className="standup-header">
          <h2>Standup Report</h2>
          <button className="close-btn" onClick={onClose}>
            x
          </button>
        </div>

        {isLoading && <p className="loading">Generating report...</p>}

        {error && <p className="error">{error}</p>}

        {report && !isLoading && (
          <>
            <div className="standup-info">
              <span>
                {report.entries.length} entries since last standup
              </span>
            </div>

            <textarea
              className="standup-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
            />

            <div className="standup-actions">
              {isCopied ? (
                <span className="copied-message">
                  Copied to clipboard! Closing...
                </span>
              ) : (
                <>
                  <button className="primary" onClick={handleCopyAndSave}>
                    Copy to Clipboard & Save
                  </button>
                  <button onClick={onClose}>Cancel</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

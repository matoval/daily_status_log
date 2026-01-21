import { useState } from "react";
import { exportEntries, saveExportFile, ExportFormat } from "../lib/export";

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const content = await exportEntries(
        fromDate || null,
        toDate || null,
        format
      );

      const saved = await saveExportFile(content, format);

      if (saved) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setIsExporting(false);
      }
    } catch (err) {
      setError("Failed to export entries");
      console.error(err);
      setIsExporting(false);
    }
  };

  return (
    <div className="export-modal">
      <div className="export-content">
        <div className="export-header">
          <h2>Export Entries</h2>
          <button className="close-btn" onClick={onClose}>
            x
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {success ? (
          <p className="success">Export saved successfully!</p>
        ) : (
          <>
            <div className="export-form">
              <div className="form-group">
                <label htmlFor="export-from-date">From Date (optional)</label>
                <input
                  id="export-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="export-to-date">To Date (optional)</label>
                <input
                  id="export-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="export-format">Export Format</label>
                <select
                  id="export-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>
            </div>

            <div className="export-actions">
              <button
                className="primary"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? "Exporting..." : "Export"}
              </button>
              <button onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

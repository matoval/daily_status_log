import { useState } from "react";
import { Entry, deleteEntry } from "../lib/tauri";

interface EntryListProps {
  entries: Entry[];
  onEntryDeleted: () => void;
}

export function EntryList({ entries, onEntryDeleted }: EntryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this entry?")) {
      try {
        await deleteEntry(id);
        onEntryDeleted();
      } catch (error) {
        console.error("Failed to delete entry:", error);
      }
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const todayEntries = entries.filter((e) => e.date === today);
  const pastEntries = entries.filter((e) => e.date !== today);

  // Group past entries by date
  const entriesByDate = pastEntries.reduce(
    (acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = [];
      }
      acc[entry.date].push(entry);
      return acc;
    },
    {} as Record<string, Entry[]>
  );

  const renderEntry = (entry: Entry) => {
    const isExpanded = expandedId === entry.id;
    const completedTasks = entry.tasks.filter((t) => t.completed).length;
    const totalTasks = entry.tasks.length;

    return (
      <div
        key={entry.id}
        className={`entry-card ${isExpanded ? "expanded" : ""}`}
        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
      >
        <div className="entry-header">
          <span className="entry-time">{formatTime(entry.created_at)}</span>
          <span className="entry-summary">
            {totalTasks > 0 && (
              <span className="task-count">
                {completedTasks}/{totalTasks} tasks
              </span>
            )}
          </span>
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(entry.id);
            }}
          >
            x
          </button>
        </div>

        {isExpanded && (
          <div className="entry-details">
            {entry.content && <p className="entry-content">{entry.content}</p>}

            {entry.tasks.length > 0 && (
              <ul className="entry-tasks">
                {entry.tasks.map((task, i) => (
                  <li key={i} className={task.completed ? "completed" : ""}>
                    {task.completed ? "[x]" : "[ ]"} {task.text}
                  </li>
                ))}
              </ul>
            )}

            {entry.blockers && (
              <div className="entry-blockers">
                <strong>Blockers:</strong> {entry.blockers}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="entry-list">
      {todayEntries.length > 0 && (
        <section className="today-section">
          <h3>Today</h3>
          {todayEntries.map(renderEntry)}
        </section>
      )}

      {Object.keys(entriesByDate).length > 0 && (
        <section className="past-section">
          <h3>Recent</h3>
          {Object.entries(entriesByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 7)
            .map(([date, dateEntries]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  {formatDate(date)} ({dateEntries.length} entries)
                </div>
                {dateEntries.map(renderEntry)}
              </div>
            ))}
        </section>
      )}

      {entries.length === 0 && (
        <p className="no-entries">No entries yet. Create your first entry!</p>
      )}
    </div>
  );
}

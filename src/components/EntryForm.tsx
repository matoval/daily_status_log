import { useState } from "react";
import { createEntry, Task } from "../lib/tauri";

interface EntryFormProps {
  onEntryCreated: () => void;
}

export function EntryForm({ onEntryCreated }: EntryFormProps) {
  const [content, setContent] = useState("");
  const [taskText, setTaskText] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blockers, setBlockers] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const addTask = () => {
    if (taskText.trim()) {
      setTasks([...tasks, { text: taskText.trim(), completed: false }]);
      setTaskText("");
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const toggleTask = (index: number) => {
    setTasks(
      tasks.map((task, i) =>
        i === index ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && tasks.length === 0) return;

    setIsSubmitting(true);
    try {
      await createEntry(
        content.trim() || "Status update",
        tasks,
        blockers.trim() || null
      );
      setContent("");
      setTasks([]);
      setBlockers("");
      setShowForm(false);
      onEntryCreated();
    } catch (error) {
      console.error("Failed to create entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <button className="new-entry-btn" onClick={() => setShowForm(true)}>
        + New Entry
      </button>
    );
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h3>New Entry</h3>
        <button
          type="button"
          className="close-btn"
          onClick={() => setShowForm(false)}
        >
          x
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="entry-content">What did you work on?</label>
        <textarea
          id="entry-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe your work..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-input">Tasks</label>
        <div className="task-input">
          <input
            id="task-input"
            type="text"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="Add a task..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTask();
              }
            }}
          />
          <button type="button" onClick={addTask}>
            Add
          </button>
        </div>
        <ul className="task-list">
          {tasks.map((task, index) => (
            <li key={index} className={task.completed ? "completed" : ""}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(index)}
              />
              <span>{task.text}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeTask(index)}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="form-group">
        <label htmlFor="entry-blockers">Blockers (optional)</label>
        <textarea
          id="entry-blockers"
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          placeholder="Any blockers or issues?"
          rows={2}
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Entry"}
        </button>
        <button type="button" onClick={() => setShowForm(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

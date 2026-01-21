import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "./EntryForm";
import { setupTauriMocks, resetTauriMocks, mockInvoke } from "../test/mocks";

describe("EntryForm - Debug Tests", () => {
  beforeEach(() => {
    resetTauriMocks();
    setupTauriMocks();
  });

  it("content textarea should update when typed into", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const textarea = screen.getByPlaceholderText("Describe your work...") as HTMLTextAreaElement;
    await user.type(textarea, "Working on feature X");

    expect(textarea.value).toBe("Working on feature X");
  });

  it("blockers textarea should update when typed into", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const textarea = screen.getByPlaceholderText("Any blockers or issues?") as HTMLTextAreaElement;
    await user.type(textarea, "Waiting on API");

    expect(textarea.value).toBe("Waiting on API");
  });

  it("task input should clear after adding a task", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const taskInput = screen.getByPlaceholderText("Add a task...") as HTMLInputElement;
    await user.type(taskInput, "New task");
    await user.click(screen.getByText("Add"));

    // Input should be cleared
    expect(taskInput.value).toBe("");
    // Task should appear in list
    expect(screen.getByText("New task")).toBeInTheDocument();
  });

  it("multiple tasks can be added and all appear in list", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const taskInput = screen.getByPlaceholderText("Add a task...");

    // Add multiple tasks
    await user.type(taskInput, "Task 1{enter}");
    await user.type(taskInput, "Task 2{enter}");
    await user.type(taskInput, "Task 3{enter}");

    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(screen.getByText("Task 2")).toBeInTheDocument();
    expect(screen.getByText("Task 3")).toBeInTheDocument();

    // Should have 3 checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
  });

  it("task checkbox state persists after toggling", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "Toggle test{enter}");

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;

    // Initially unchecked
    expect(checkbox.checked).toBe(false);

    // Toggle on
    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);

    // Toggle off
    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it("form data is correctly sent to backend on submit", async () => {
    const user = userEvent.setup();
    const onEntryCreated = vi.fn();
    render(<EntryForm onEntryCreated={onEntryCreated} />);

    await user.click(screen.getByText("+ New Entry"));

    // Fill content
    await user.type(screen.getByPlaceholderText("Describe your work..."), "Test content");

    // Add tasks
    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "Task A{enter}");
    await user.type(taskInput, "Task B{enter}");

    // Mark first task as complete
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    // Add blocker
    await user.type(screen.getByPlaceholderText("Any blockers or issues?"), "Test blocker");

    // Submit
    await user.click(screen.getByText("Save Entry"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("create_entry", {
        content: "Test content",
        tasks: [
          { text: "Task A", completed: true },
          { text: "Task B", completed: false },
        ],
        blockers: "Test blocker",
      });
    });
  });

  it("labels should be properly associated with inputs for accessibility", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    // These should work because labels are properly associated via htmlFor/id
    expect(screen.getByLabelText("What did you work on?")).toBeInTheDocument();
    expect(screen.getByLabelText("Tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("Blockers (optional)")).toBeInTheDocument();
  });
});

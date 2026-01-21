import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryForm } from "./EntryForm";
import { setupTauriMocks, resetTauriMocks, mockInvoke } from "../test/mocks";

describe("EntryForm", () => {
  beforeEach(() => {
    resetTauriMocks();
    setupTauriMocks();
  });

  it("renders the new entry button initially", () => {
    render(<EntryForm onEntryCreated={vi.fn()} />);
    expect(screen.getByText("+ New Entry")).toBeInTheDocument();
  });

  it("shows the form when clicking new entry button", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    expect(screen.getByText("New Entry")).toBeInTheDocument();
    expect(screen.getByText("What did you work on?")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Blockers (optional)")).toBeInTheDocument();
  });

  it("can add tasks to the list", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "My first task");
    await user.click(screen.getByText("Add"));

    expect(screen.getByText("My first task")).toBeInTheDocument();
  });

  it("can add tasks by pressing Enter", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "Task via enter{enter}");

    expect(screen.getByText("Task via enter")).toBeInTheDocument();
  });

  it("can toggle task completion", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    // Add a task
    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "Toggle me{enter}");

    // Find and click the checkbox
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("can remove tasks", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    // Add a task
    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "Remove me{enter}");

    expect(screen.getByText("Remove me")).toBeInTheDocument();

    // Click the remove button (x) - it's inside the task list item
    const taskItem = screen.getByText("Remove me").closest("li");
    const removeBtn = taskItem?.querySelector(".remove-btn") as HTMLButtonElement;
    await user.click(removeBtn);

    expect(screen.queryByText("Remove me")).not.toBeInTheDocument();
  });

  it("can close the form with cancel button", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));
    expect(screen.getByText("New Entry")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("New Entry")).not.toBeInTheDocument();
    expect(screen.getByText("+ New Entry")).toBeInTheDocument();
  });

  it("can close the form with close button", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    // Click the close button in the header
    const closeButtons = screen.getAllByRole("button", { name: "x" });
    await user.click(closeButtons[0]); // First x is the close button

    expect(screen.queryByText("New Entry")).not.toBeInTheDocument();
  });

  it("submits the form with content and tasks", async () => {
    const user = userEvent.setup();
    const onEntryCreated = vi.fn();
    render(<EntryForm onEntryCreated={onEntryCreated} />);

    await user.click(screen.getByText("+ New Entry"));

    // Fill in content
    const contentInput = screen.getByPlaceholderText("Describe your work...");
    await user.type(contentInput, "Worked on testing");

    // Add a task
    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "Write tests{enter}");

    // Add blocker
    const blockerInput = screen.getByPlaceholderText("Any blockers or issues?");
    await user.type(blockerInput, "Need more coffee");

    // Submit
    await user.click(screen.getByText("Save Entry"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("create_entry", {
        content: "Worked on testing",
        tasks: [{ text: "Write tests", completed: false }],
        blockers: "Need more coffee",
      });
    });

    await waitFor(() => {
      expect(onEntryCreated).toHaveBeenCalled();
    });
  });

  it("clears form after successful submission", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    const contentInput = screen.getByPlaceholderText("Describe your work...");
    await user.type(contentInput, "Some work");

    const taskInput = screen.getByPlaceholderText("Add a task...");
    await user.type(taskInput, "A task{enter}");

    await user.click(screen.getByText("Save Entry"));

    await waitFor(() => {
      expect(screen.getByText("+ New Entry")).toBeInTheDocument();
    });
  });

  it("does not submit when content and tasks are empty", async () => {
    const user = userEvent.setup();
    const onEntryCreated = vi.fn();
    render(<EntryForm onEntryCreated={onEntryCreated} />);

    await user.click(screen.getByText("+ New Entry"));
    await user.click(screen.getByText("Save Entry"));

    expect(mockInvoke).not.toHaveBeenCalledWith("create_entry", expect.anything());
    expect(onEntryCreated).not.toHaveBeenCalled();
  });

  it("does not add empty tasks", async () => {
    const user = userEvent.setup();
    render(<EntryForm onEntryCreated={vi.fn()} />);

    await user.click(screen.getByText("+ New Entry"));

    await user.click(screen.getByText("Add"));

    // No task should be added
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

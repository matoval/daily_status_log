import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";
import { setupTauriMocks, resetTauriMocks, mockSettings, mockInvoke } from "../test/mocks";

describe("Settings - Debug Tests", () => {
  beforeEach(() => {
    resetTauriMocks();
    setupTauriMocks();
  });

  it("reminder time selects should be enabled when reminder is enabled", async () => {
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    });

    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;

    // mockSettings has reminder_enabled: true, so selects should be enabled
    expect(hourSelect).not.toBeDisabled();
    expect(minuteSelect).not.toBeDisabled();
    expect(hourSelect.value).toBe("09");
    expect(minuteSelect.value).toBe("00");
  });

  it("reminder time selects should update when changed", async () => {
    const user = userEvent.setup();
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    });

    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;

    await user.selectOptions(hourSelect, "17");
    await user.selectOptions(minuteSelect, "30");

    expect(hourSelect.value).toBe("17");
    expect(minuteSelect.value).toBe("30");
  });

  it("changing reminder time should be saved correctly", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    });

    const hourSelect = screen.getByLabelText("Hour");
    const minuteSelect = screen.getByLabelText("Minute");

    // Change the time
    await user.selectOptions(hourSelect, "14");
    await user.selectOptions(minuteSelect, "00");

    // Save
    await user.click(screen.getByText("Save Settings"));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("update_settings", {
        settings: expect.objectContaining({
          reminder_time: "14:00",
        }),
      });
    });
  });

  it("time selects should show all valid hour and minute values", async () => {
    render(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    });

    const hourSelect = screen.getByLabelText("Hour") as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText("Minute") as HTMLSelectElement;

    // Should have 24 hour options (00-23)
    expect(hourSelect.options).toHaveLength(24);
    expect(hourSelect.options[0].value).toBe("00");
    expect(hourSelect.options[23].value).toBe("23");

    // Should have 60 minute options (00-59)
    expect(minuteSelect.options).toHaveLength(60);
    expect(minuteSelect.options[0].value).toBe("00");
    expect(minuteSelect.options[59].value).toBe("59");
  });
});

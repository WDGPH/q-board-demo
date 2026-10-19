import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { KioskView } from "../src/components/KioskView";
import { demoEvent, initialDemo } from "../src/lib/demo";
import { useState } from "react";

afterEach(() => vi.useRealTimers());

it("mixes public questions across sessions, labels their source, and switches back", async () => {
  const sessions = [
    {
      id: "all",
      title: "Opening panel",
      description: "",
      starts_at: "2026-11-20T09:00:00Z",
    },
    {
      id: "closing",
      title: "Closing panel",
      description: "",
      starts_at: "2026-11-20T16:00:00Z",
    },
  ];
  const samples = initialDemo();
  const questions = [
    { ...samples[0], session_id: "all" },
    { ...samples[1], session_id: "closing" },
    samples[2],
    samples[7],
    samples[9],
  ];
  function Kiosk() {
    const [selected, setSelected] = useState<string | null>("all");
    return (
      <KioskView
        event={{ ...demoEvent, sessions }}
        questions={questions}
        selectedSessionId={selected}
        onSessionChange={(id) => setSelected(id || null)}
        onExit={vi.fn()}
        error=""
        preview
      />
    );
  }
  render(<Kiosk />);
  const user = userEvent.setup();
  const selector = screen.getByRole("combobox", { name: "Kiosk session" });
  expect(
    screen.getByRole("heading", { name: "Opening panel" }),
  ).toBeInTheDocument();
  await user.selectOptions(
    selector,
    screen.getByRole("option", { name: "All sessions" }),
  );
  expect(
    screen.getByRole("heading", { name: "All sessions" }),
  ).toBeInTheDocument();
  expect(screen.getByText("03 questions on the board")).toBeInTheDocument();
  expect(
    screen.getByText("Opening panel", { selector: ".kiosk-card-bottom span" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Open the attendee question board" }),
  ).toHaveAttribute("href", `${window.location.origin}/e/${demoEvent.slug}`);
  await user.click(screen.getByRole("button", { name: "Next question" }));
  expect(screen.getByText(samples[1].question_text)).toBeInTheDocument();
  expect(
    screen.getByText("Closing panel", { selector: ".kiosk-card-bottom span" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next question" }));
  expect(screen.getByText(samples[2].question_text)).toBeInTheDocument();
  expect(
    screen.getByText("General questions", {
      selector: ".kiosk-card-bottom span",
    }),
  ).toBeInTheDocument();
  await user.selectOptions(
    selector,
    screen.getByRole("option", { name: /^Closing panel/ }),
  );
  expect(
    screen.getByRole("heading", { name: "Closing panel" }),
  ).toBeInTheDocument();
  expect(screen.getByText("01 questions on the board")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Open the attendee question board" }),
  ).toHaveAttribute("href", expect.stringContaining("?session=closing"));
});

it("projects public questions only, rotates, and can pause", () => {
  vi.useFakeTimers();
  render(
    <KioskView
      event={demoEvent}
      questions={initialDemo()}
      selectedSessionId={null}
      onSessionChange={vi.fn()}
      onExit={vi.fn()}
      error=""
      preview
    />,
  );
  expect(screen.getByText(initialDemo()[0].question_text)).toBeInTheDocument();
  expect(
    screen.queryByText(initialDemo()[7].question_text),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(initialDemo()[0].moderator_note!),
  ).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(16000));
  expect(screen.getByText(initialDemo()[1].question_text)).toBeInTheDocument();
  act(() => screen.getByRole("button", { name: "Pause rotation" }).click());
  act(() => vi.advanceTimersByTime(32000));
  expect(screen.getByText(initialDemo()[1].question_text)).toBeInTheDocument();
});

it("scopes questions and the participation destination to the selected session", async () => {
  const event = {
    ...demoEvent,
    sessions: [
      {
        id: "opening",
        title: "Opening panel",
        description: "",
        starts_at: "2026-11-20T09:00:00Z",
      },
    ],
  };
  const onExit = vi.fn();
  render(
    <KioskView
      event={event}
      questions={initialDemo()}
      selectedSessionId="opening"
      onSessionChange={vi.fn()}
      onExit={onExit}
      error="Network unavailable"
      preview={false}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Opening panel" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(initialDemo()[0].question_text),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Open the attendee question board" }),
  ).toHaveAttribute("href", expect.stringContaining("?session=opening"));
  expect(screen.getByRole("status")).toHaveTextContent("Reconnecting");
  await userEvent.keyboard("{Escape}");
  expect(onExit).toHaveBeenCalledOnce();
});

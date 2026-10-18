import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { KioskView } from "../src/components/KioskView";
import { demoEvent, initialDemo } from "../src/lib/demo";

afterEach(() => vi.useRealTimers());

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

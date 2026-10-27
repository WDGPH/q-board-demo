import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { initialDemo, readDemo, saveDemo } from "../src/lib/demo";

vi.mock("../src/lib/supabase", () => ({
  preview: true,
  supabase: null,
  configurationError: "",
}));
vi.mock("../event.config", () => ({
  default: {
    sessions: [
      {
        id: "opening",
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
    ],
  },
}));

beforeEach(() => {
  localStorage.clear();
  saveDemo(
    initialDemo().map((q, i) => ({
      ...q,
      session_id: i === 6 ? "closing" : i === 4 ? null : "opening",
    })),
  );
  window.history.replaceState({}, "", "/moderator/ranked?session=opening");
});

it("opens directly, ranks shortlist before higher-voted approved questions, and excludes other statuses/sessions", async () => {
  render(<App />);
  const list = await screen.findByRole("list", {
    name: "Questions in ranked order",
  });
  const texts = within(list)
    .getAllByRole("heading", { level: 2 })
    .map((node) => node.textContent);
  const samples = initialDemo();
  expect(texts).toEqual(
    [samples[0], samples[3], samples[1], samples[2]].map(
      (q) => q.question_text,
    ),
  );
  expect(within(list).getAllByText(samples[0].moderator_note!)).toHaveLength(2);
  await userEvent.click(
    within(within(list).getAllByRole("listitem")[0]).getByRole("button", {
      name: "Mark answered",
    }),
  );
  expect(screen.queryByText(samples[0].question_text)).not.toBeInTheDocument();
  expect(readDemo()[0]).toMatchObject({
    status: "answered",
    moderator_note: samples[0].moderator_note,
  });
});

it("preserves selected sessions through dashboard links, direct reloads, and general questions", async () => {
  window.history.replaceState(
    {},
    "",
    "/moderator/public-health-ai-symposium?session=closing",
  );
  const user = userEvent.setup();
  const view = render(<App />);
  const link = await screen.findByRole("link", { name: "Open ranked view" });
  expect(link).toHaveAttribute(
    "href",
    "/moderator/public-health-ai-symposium/ranked?session=closing",
  );
  await user.click(link);
  expect(
    await screen.findByText(initialDemo()[6].question_text),
  ).toBeInTheDocument();
  await user.click(
    screen.getByText("Closing panel", { selector: ".session-summary-title" }),
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Choose a Session" }),
    "",
  );
  expect(window.location.search).toBe("?session=");
  expect(screen.getByText(initialDemo()[4].question_text)).toBeInTheDocument();
  expect(
    screen.queryByText(initialDemo()[6].question_text),
  ).not.toBeInTheDocument();
  view.unmount();
  render(<App />);
  expect(
    await screen.findByText(initialDemo()[4].question_text),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Moderator panel" })).toHaveAttribute(
    "href",
    "/moderator/public-health-ai-symposium?session=",
  );
});

it("handles empty sessions and live status/vote changes", async () => {
  render(<App />);
  await screen.findByRole("list");
  saveDemo(readDemo().map((q) => ({ ...q, status: "answered" })));
  fireEvent(window, new Event("storage"));
  expect(
    await screen.findByRole("heading", { name: "No questions ready yet." }),
  ).toBeInTheDocument();
  saveDemo(
    initialDemo().map((q) => ({
      ...q,
      session_id: "opening",
      vote_count: q.id === "demo-2" ? 100 : q.vote_count,
    })),
  );
  fireEvent(window, new Event("storage"));
  const list = await screen.findByRole("list");
  expect(
    within(list).getAllByRole("heading", { level: 2 })[2],
  ).toHaveTextContent(initialDemo()[2].question_text);
});

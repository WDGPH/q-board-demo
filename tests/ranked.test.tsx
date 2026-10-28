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
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    /^Ranked questions$/,
  );
  expect(screen.getByRole("status")).toHaveTextContent("4 questions remaining");
  const samples = initialDemo();
  expect(texts).toEqual(
    [samples[0], samples[3], samples[1], samples[2], samples[5]].map(
      (q) => q.question_text,
    ),
  );
  expect(within(list).getAllByText(samples[0].moderator_note!)).toHaveLength(2);
  await userEvent.click(
    within(within(list).getAllByRole("listitem")[0]).getByRole("button", {
      name: "Mark answered",
    }),
  );
  expect(
    within(list).getAllByRole("heading", { level: 2 }).at(-1),
  ).toHaveTextContent(samples[0].question_text);
  expect(screen.getByText(samples[0].question_text).closest("li")).toHaveClass(
    "ranked-answered",
  );
  expect(readDemo()[0]).toMatchObject({
    status: "answered",
    moderator_note: samples[0].moderator_note,
    answered_from_status: "shortlisted",
  });
  expect(screen.getByRole("status")).toHaveTextContent("3 questions remaining");
});

it("keeps answer order across reloads and restores the original shortlist when unmarked", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  const list = await screen.findByRole("list");
  async function toggle(id: number, label: string) {
    const card = screen
      .getByText(initialDemo()[id].question_text)
      .closest("li")!;
    await user.click(within(card).getByRole("button", { name: label }));
  }
  await toggle(3, "Mark answered");
  await toggle(0, "Mark answered");
  expect(
    within(list)
      .getAllByRole("heading", { level: 2 })
      .slice(-3)
      .map((node) => node.textContent),
  ).toEqual([5, 3, 0].map((i) => initialDemo()[i].question_text));
  view.unmount();
  render(<App />);
  const reloaded = await screen.findByRole("list");
  expect(
    within(reloaded).getAllByRole("heading", { level: 2 }).at(-1),
  ).toHaveTextContent(initialDemo()[0].question_text);
  await toggle(0, "Unmark as answered");
  expect(screen.getByRole("status")).toHaveTextContent("3 questions remaining");
  expect(
    within(reloaded).getAllByRole("heading", { level: 2 })[0],
  ).toHaveTextContent(initialDemo()[0].question_text);
  expect(readDemo()[0]).toMatchObject({
    status: "shortlisted",
    answered_at: null,
  });
  await toggle(5, "Unmark as answered");
  expect(readDemo()[5].status).toBe("approved");
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
  expect(screen.getByRole("status")).toHaveTextContent("1 question remaining");
  expect(
    screen.getByRole("combobox", { name: "Choose a Session" }),
  ).toBeVisible();
  const details = screen.getByRole("button", { name: "Session details" });
  expect(details).toHaveAttribute("aria-expanded", "false");
  await user.click(details);
  expect(screen.getByRole("heading", { name: "Closing panel" })).toBeVisible();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Choose a Session" }),
    "",
  );
  expect(window.location.search).toBe("?session=");
  expect(details).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.queryByRole("heading", { name: "General questions" }),
  ).not.toBeInTheDocument();
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
  saveDemo(readDemo().map((q) => ({ ...q, status: "hidden" })));
  fireEvent(window, new Event("storage"));
  expect(
    await screen.findByRole("heading", { name: "No questions ready yet." }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("0 questions remaining");
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

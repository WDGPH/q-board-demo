import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { QuestionForm } from "../src/components/QuestionForm";
import { demoEvent, demoText } from "../src/lib/demo";
import {
  configuredEvent,
  configureDatabaseEvent,
  resolveEvent,
  resolveText,
} from "../src/lib/event";

vi.mock("../event.config", () => ({
  default: {
    name: "Community Conference",
    slug: "community-conference",
    description: "Questions from our community.",
    ends_at: null,
    is_active: false,
    text: {
      attendeeHeading: "Community questions\n<Your turn>",
      questionHeading: "Ask our community",
      submitQuestion: "Send question",
      questionRequired: "Please share a question first.",
      anonymousAttendee: "Community member",
      moderatorNoteLabel: "Host notes",
      approve: "Publish",
      footerMessage: "",
    },
  },
}));
vi.mock("../src/lib/supabase", () => ({
  preview: true,
  supabase: null,
  configurationError: "",
}));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("event configuration", () => {
  it("falls back to demo values for omitted and undefined fields", () => {
    expect(resolveEvent({})).toEqual(demoEvent);
    expect(resolveEvent({ name: "New event", slug: undefined })).toEqual({
      ...demoEvent,
      name: "New event",
    });
  });

  it("preserves explicit null, empty descriptions, and false", () => {
    expect(
      resolveEvent({
        description: null,
        starts_at: null,
        ends_at: null,
        is_active: false,
      }),
    ).toEqual({
      ...demoEvent,
      description: null,
      starts_at: null,
      ends_at: null,
      is_active: false,
    });
    expect(resolveEvent({ description: "" }).description).toBe("");
  });

  it("keeps database identity and omitted details for the configured event", () => {
    const databaseEvent = {
      ...demoEvent,
      id: "database-id",
      slug: configuredEvent.slug,
      starts_at: "2027-01-01T09:00:00Z",
    };
    expect(configureDatabaseEvent(databaseEvent)).toEqual({
      ...configuredEvent,
      id: databaseEvent.id,
      starts_at: databaseEvent.starts_at,
    });
    expect(configureDatabaseEvent(demoEvent)).toBe(demoEvent);
  });

  it.each(["/", "/e/community-conference"])(
    "uses configured details and activity at %s",
    async (path) => {
      window.history.replaceState({}, "", path);
      render(<App />);
      expect(
        await screen.findByText("Community Conference"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Questions from our community."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Send question" }),
      ).toBeDisabled();
    },
  );

  it("uses the configured slug for the moderator route", async () => {
    window.history.replaceState({}, "", "/moderator/community-conference");
    render(<App />);
    expect(await screen.findByText("Community Conference")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /export csv/i }),
    ).toBeInTheDocument();
  });

  it("rejects the old demo slug when a different slug is configured", async () => {
    window.history.replaceState({}, "", `/e/${demoEvent.slug}`);
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This event could not be found.",
    );
  });

  it("falls back independently for omitted and undefined text keys", () => {
    expect(resolveText()).toEqual(demoText);
    expect(
      resolveText({
        questionHeading: "Ask us",
        footerMessage: "",
        approve: undefined,
      }),
    ).toEqual({ ...demoText, questionHeading: "Ask us", footerMessage: "" });
  });

  it("renders text overrides in the app, form, and question cards", async () => {
    render(<App />);
    const heading = await screen.findByRole("heading", {
      name: /Community questions\s*<Your turn>/,
    });
    expect(heading.querySelector("br")).toBeInTheDocument();
    expect(heading).toHaveTextContent("<Your turn>");
    expect(
      screen.getByRole("heading", { name: "Ask our community" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Community member").length).toBeGreaterThan(0);
    expect(screen.getByText(demoText.brandTagline)).toBeInTheDocument();
    expect(screen.queryByText(demoText.footerMessage)).not.toBeInTheDocument();
  });

  it("uses overridden moderator labels without changing moderation actions", async () => {
    window.history.replaceState({}, "", "/moderator");
    render(<App />);
    await screen.findByText("Community Conference");
    expect(screen.getAllByLabelText("Host notes").length).toBeGreaterThan(0);
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: demoText.allStatuses }),
    );
    await user.click(screen.getAllByRole("button", { name: "Publish" })[0]);
    expect(screen.getByText(demoText.noteSaved)).toBeInTheDocument();
  });

  it("uses overridden validation messages and default placeholders", async () => {
    const submit = vi.fn();
    render(<QuestionForm onSubmit={submit} />);
    expect(
      screen.getByPlaceholderText(demoText.questionPlaceholder),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Send question" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please share a question first.",
    );
    expect(submit).not.toHaveBeenCalled();
  });
});

it("resolves optional preview sessions and uses database sessions in connected mode", () => {
  const sessions = [
    {
      id: "opening",
      title: "Opening",
      description: "Panel",
      starts_at: "2026-11-20T09:00:00Z",
    },
  ];
  expect(resolveEvent({ sessions }).sessions).toEqual(sessions);
  expect(
    resolveEvent({ sessions: [] }, { ...demoEvent, sessions }).sessions,
  ).toEqual([]);
  expect(
    configureDatabaseEvent({
      ...demoEvent,
      slug: configuredEvent.slug,
      sessions,
    }).sessions,
  ).toEqual(sessions);
});

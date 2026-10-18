import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";

const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("../event.config", () => ({ default: {} }));
vi.mock("../src/lib/supabase", async () => {
  const { demoEvent, initialDemo } = await import("../src/lib/demo");
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: demoEvent, error: null }),
  };
  return {
    preview: false,
    configurationError: "",
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: { user: { id: "user" } } },
          error: null,
        }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: () => query,
      rpc: async (name: string) => ({
        data: name === "is_moderator" ? access.allowed : initialDemo(),
        error: null,
      }),
    },
  };
});

beforeEach(() => {
  access.allowed = true;
  window.history.replaceState({}, "", "/moderator");
});

it("keeps kiosk controls behind moderator authorization", async () => {
  access.allowed = false;
  render(<App />);
  expect(
    await screen.findByRole("button", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Open kiosk" }),
  ).not.toBeInTheDocument();
});

it("closes the kiosk when a refresh detects revoked moderator access", async () => {
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Open kiosk" }),
  );
  expect(
    screen.getByRole("button", { name: "Exit kiosk" }),
  ).toBeInTheDocument();
  access.allowed = false;
  fireEvent(window, new Event("online"));
  expect(
    await screen.findByRole("button", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Exit kiosk" }),
  ).not.toBeInTheDocument();
});

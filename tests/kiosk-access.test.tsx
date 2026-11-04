import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";

const access = vi.hoisted(() => ({
  allowed: true,
  rpcCalls: [] as { name: string; args?: Record<string, unknown> }[],
  updateUser: vi.fn(async (_input: { password: string }) => ({ error: null })),
}));
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
        updateUser: access.updateUser,
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: () => query,
      rpc: async (name: string, args?: Record<string, unknown>) => {
        access.rpcCalls.push({ name, args });
        return {
          data: name === "is_moderator" ? access.allowed : initialDemo(),
          error: null,
        };
      },
    },
  };
});

beforeEach(() => {
  access.allowed = true;
  access.rpcCalls.length = 0;
  access.updateUser.mockClear();
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

it("loads the kiosk route using only the public question list", async () => {
  window.history.replaceState({}, "", "/kiosk/test-event");
  render(<App />);

  expect(
    await screen.findByRole("button", { name: "Exit kiosk" }),
  ).toBeInTheDocument();
  expect(access.rpcCalls).toContainEqual({
    name: "list_questions",
    args: { p_event_id: "demo", p_moderator: false },
  });
  expect(access.rpcCalls.some((call) => call.name === "is_moderator")).toBe(
    false,
  );
});

it("protects direct ranked links and removes ranked content when access is revoked", async () => {
  window.history.replaceState({}, "", "/moderator/ranked");
  access.allowed = false;
  const view = render(<App />);
  expect(
    await screen.findByRole("button", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  view.unmount();
  access.allowed = true;
  render(<App />);
  expect(await screen.findByRole("list")).toBeInTheDocument();
  access.allowed = false;
  fireEvent(window, new Event("online"));
  expect(
    await screen.findByRole("button", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("keeps the public kiosk open when moderator access is revoked", async () => {
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Open kiosk" }),
  );
  expect(
    screen.getByRole("button", { name: "Exit kiosk" }),
  ).toBeInTheDocument();
  const previousListCalls = access.rpcCalls.filter(
    (call) => call.name === "list_questions",
  ).length;
  access.allowed = false;
  fireEvent(window, new Event("online"));
  await waitFor(() =>
    expect(
      access.rpcCalls.filter((call) => call.name === "list_questions"),
    ).toHaveLength(previousListCalls + 1),
  );
  expect(
    access.rpcCalls.filter((call) => call.name === "list_questions").at(-1)
      ?.args?.p_moderator,
  ).toBe(false);
  expect(
    screen.getByRole("button", { name: "Exit kiosk" }),
  ).toBeInTheDocument();
  expect(access.rpcCalls.some((call) => call.name === "is_moderator")).toBe(
    true,
  );
});

it("lets an authorized moderator change their password", async () => {
  render(<App />);
  await userEvent.click(
    await screen.findByRole("link", { name: "Change password" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Change your password" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  await userEvent.type(screen.getByLabelText("New password"), "new-password");
  await userEvent.type(
    screen.getByLabelText("Confirm new password"),
    "different-password",
  );
  await userEvent.click(screen.getByRole("button", { name: "Update password" }));
  expect(screen.getByText("The passwords do not match.")).toBeInTheDocument();
  expect(access.updateUser).not.toHaveBeenCalled();

  await userEvent.clear(screen.getByLabelText("Confirm new password"));
  await userEvent.type(
    screen.getByLabelText("Confirm new password"),
    "new-password",
  );
  await userEvent.click(screen.getByRole("button", { name: "Update password" }));
  expect(access.updateUser).toHaveBeenCalledWith({ password: "new-password" });
  expect(
    await screen.findByText("Your password has been updated."),
  ).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("link", { name: "Close password dialog" }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open ranked view" })).toBeVisible();
});

it("closes the password dialog when Escape is pressed", async () => {
  window.history.replaceState({}, "", "/moderator/password");
  render(<App />);
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("protects direct password-change links behind moderator authorization", async () => {
  access.allowed = false;
  window.history.replaceState({}, "", "/moderator/password");
  render(<App />);
  expect(
    await screen.findByRole("button", { name: "Sign in" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Change your password" }),
  ).not.toBeInTheDocument();
});

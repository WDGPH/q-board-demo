import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import { demoEvent, initialDemo } from "../src/lib/demo";

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
const state = vi.hoisted(() => ({ moderator: false }));

vi.mock("../event.config", () => ({ default: {} }));
vi.mock("../src/lib/supabase", () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: demoEvent, error: null }),
  };
  return {
    preview: false,
    configurationError: "",
    supabase: {
      auth,
      from: () => query,
      rpc: async (name: string) => ({
        data: name === "is_moderator" ? state.moderator : initialDemo(),
        error: null,
      }),
    },
  };
});

const recoverySession = { user: { id: "moderator-user" } };

beforeEach(() => {
  vi.clearAllMocks();
  state.moderator = false;
  auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });
  auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  auth.signInAnonymously.mockResolvedValue({
    data: { user: { id: "attendee-user" } },
    error: null,
  });
  auth.signInWithPassword.mockImplementation(async () => {
    state.moderator = true;
    return { error: null };
  });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
  window.history.replaceState({}, "", "/");
});

describe("moderator password recovery", () => {
  it("requests reset with the dedicated route and neutral confirmation", async () => {
    window.history.replaceState({}, "", "/moderator");
    render(<App />);
    await userEvent.type(
      await screen.findByLabelText("Email address"),
      "person@example.com",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Forgot password?" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Send reset link" }),
    );

    await waitFor(() =>
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "person@example.com",
        { redirectTo: `${window.location.origin}/reset-password` },
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If an account exists for that email, password reset instructions will be sent.",
    );
  });

  it("shows the password form when a recovery session already exists", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: recoverySession },
      error: null,
    });
    window.history.replaceState({}, "", "/reset-password");
    render(<App />);

    expect(await screen.findByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update password" }),
    ).toBeEnabled();
  });

  it("shows the password form when PASSWORD_RECOVERY arrives", async () => {
    let authListener:
      | ((event: string, session: typeof recoverySession | null) => void)
      | undefined;
    auth.onAuthStateChange.mockImplementation((callback) => {
      authListener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    window.history.replaceState({}, "", "/reset-password");
    render(<App />);
    await waitFor(() => expect(authListener).toBeDefined());
    authListener!("PASSWORD_RECOVERY", recoverySession);

    expect(await screen.findByLabelText("New password")).toBeInTheDocument();
  });

  it("rejects mismatched passwords without calling Supabase", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: recoverySession },
      error: null,
    });
    window.history.replaceState({}, "", "/reset-password");
    render(<App />);
    await userEvent.type(
      await screen.findByLabelText("New password"),
      "password-one",
    );
    await userEvent.type(
      screen.getByLabelText("Confirm new password"),
      "password-two",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Update password" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The passwords do not match.",
    );
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password, signs out, and offers moderator login", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: recoverySession },
      error: null,
    });
    window.history.replaceState({}, "", "/reset-password");
    render(<App />);
    await userEvent.type(
      await screen.findByLabelText("New password"),
      "new-password",
    );
    await userEvent.type(
      screen.getByLabelText("Confirm new password"),
      "new-password",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Update password" }),
    );

    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(
      await screen.findByText("Your password has been updated."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue to moderator login" }),
    ).toHaveAttribute("href", "/moderator");
  });

  it("does not offer a password form for an invalid or expired link", async () => {
    window.history.replaceState({}, "", "/reset-password");
    render(<App />);

    expect(
      await screen.findByText(
        "This password reset link is invalid or has expired.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to moderator login" }),
    ).toHaveAttribute("href", "/moderator");
  });
});

describe("other authentication behavior", () => {
  it("keeps the existing moderator password login working", async () => {
    window.history.replaceState({}, "", "/moderator");
    render(<App />);
    await userEvent.type(
      await screen.findByLabelText("Email address"),
      "moderator@example.com",
    );
    await userEvent.type(
      screen.getByLabelText("Password"),
      "moderator-password",
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "moderator@example.com",
      password: "moderator-password",
    });
    expect(
      await screen.findByRole("button", { name: "Open kiosk" }),
    ).toBeInTheDocument();
  });

  it("continues to create anonymous attendee sessions without recovery UI", async () => {
    render(<App />);

    expect(await screen.findByText(demoEvent.name)).toBeInTheDocument();
    expect(auth.signInAnonymously).toHaveBeenCalledOnce();
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
  });
});

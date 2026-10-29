import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  LockKeyhole,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { uiText } from "../lib/event";

export function PasswordRecovery() {
  const [recoveryStatus, setRecoveryStatus] = useState<
    "checking" | "ready" | "anonymous" | "invalid"
  >("checking");
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let active = true;
    let recoveryEventReceived = false;
    let sessionWasAnonymous = false;
    let exchangeAttempted = false;
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const code = url.searchParams.get("code");
    const hasCallbackError =
      hashParams.has("error") || hashParams.has("error_code");
    const hasRecoveryCallback =
      Boolean(code) ||
      hashParams.get("type") === "recovery" ||
      Boolean(
        hashParams.get("access_token") && hashParams.get("refresh_token"),
      );

    const acceptRecoveryUser = (user: User) => {
      if (user.is_anonymous === true) {
        setRecoveryUserId(null);
        sessionWasAnonymous = true;
        setRecoveryStatus("anonymous");
      } else if (user.email) {
        setRecoveryUserId(user.id);
        setRecoveryStatus("ready");
      } else {
        setRecoveryUserId(null);
        setRecoveryStatus("invalid");
      }
    };

    if (!supabase) {
      setRecoveryStatus("invalid");
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!active || recoveryEventReceived) return;
      setRecoveryStatus(
        hasRecoveryCallback
          ? "invalid"
          : sessionWasAnonymous
            ? "anonymous"
            : "invalid",
      );
    }, 8000);

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) {
        recoveryEventReceived = true;
        acceptRecoveryUser(session.user);
        window.clearTimeout(timeout);
      }
    });

    if (hasCallbackError) {
      window.clearTimeout(timeout);
      setRecoveryStatus("invalid");
      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    }

    const processRecovery = async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase!.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active || recoveryEventReceived) return;

        const initialUser = sessionData.session?.user;
        if (
          initialUser &&
          initialUser.is_anonymous === false &&
          initialUser.email
        ) {
          acceptRecoveryUser(initialUser);
          window.clearTimeout(timeout);
          return;
        }

        if (initialUser?.is_anonymous === true) sessionWasAnonymous = true;

        if (code && hasRecoveryCallback && !exchangeAttempted) {
          exchangeAttempted = true;
          const { data: exchangeData, error: exchangeError } =
            await supabase!.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (import.meta.env.DEV) console.error(exchangeError);
          } else if (active && !recoveryEventReceived && exchangeData.session) {
            recoveryEventReceived = true;
            acceptRecoveryUser(exchangeData.session.user);
            window.clearTimeout(timeout);
          }
        }
      } catch (sessionError) {
        if (import.meta.env.DEV) console.error(sessionError);
        if (active && !recoveryEventReceived && code && !exchangeAttempted) {
          exchangeAttempted = true;
          try {
            const { data: exchangeData, error: exchangeError } =
              await supabase!.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              if (import.meta.env.DEV) console.error(exchangeError);
            } else if (
              active &&
              !recoveryEventReceived &&
              exchangeData.session
            ) {
              recoveryEventReceived = true;
              acceptRecoveryUser(exchangeData.session.user);
              window.clearTimeout(timeout);
            }
          } catch (exchangeError) {
            if (import.meta.env.DEV) console.error(exchangeError);
          }
        }
      }
    };
    void processRecovery();

    return () => {
      active = false;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  async function signOutAndContinue() {
    if (!supabase) return;
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setSignedOut(true);
    } catch (signOutError) {
      if (import.meta.env.DEV) console.error(signOutError);
      setError(uiText.resetSignOutFailed);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!newPassword || !confirmPassword) {
      setError(uiText.resetRequiredError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(uiText.resetMismatchError);
      return;
    }
    if (newPassword.length < 8) {
      setError(uiText.resetMinimumLengthError);
      return;
    }
    if (!supabase) {
      setError(uiText.resetUpdateFailed);
      return;
    }

    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData.session?.user;
      if (
        !user ||
        user.id !== recoveryUserId ||
        user.is_anonymous === true ||
        !user.email
      ) {
        setRecoveryUserId(null);
        setRecoveryStatus(
          user?.is_anonymous === true ? "anonymous" : "invalid",
        );
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      setUpdated(true);
      await signOutAndContinue();
    } catch (updateError) {
      if (import.meta.env.DEV) console.error(updateError);
      setError(uiText.resetUpdateFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <MessageSquare size={21} />
          </span>
          {uiText.brandPrefix}
          <span className="brand-light">{uiText.brandSuffix}</span>
          <span className="brand-divider" />
          <span className="brand-caption">{uiText.brandTagline}</span>
        </Link>
        <Link className="header-link" to="/moderator">
          <ArrowLeft size={15} />
          {uiText.moderatorAccess}
        </Link>
      </header>
      <main>
        <section className="login-panel">
          <span className="login-icon">
            <LockKeyhole />
          </span>
          <div className="eyebrow">{uiText.organizersEyebrow}</div>
          {recoveryStatus === "checking" ? (
            <p role="status">{uiText.resetCheckingLink}</p>
          ) : recoveryStatus === "invalid" ? (
            <>
              <h1>{uiText.resetInvalidHeading}</h1>
              <p role="alert">{uiText.resetInvalidMessage}</p>
              <Link
                className="button primary reset-link-button"
                to="/moderator"
              >
                {uiText.resetRequestAnother}
                <ArrowUpRight size={17} />
              </Link>
            </>
          ) : recoveryStatus === "anonymous" ? (
            <>
              <h1>{uiText.resetInvalidHeading}</h1>
              <p role="alert">{uiText.resetAnonymousSessionMessage}</p>
              <Link
                className="button primary reset-link-button"
                to="/moderator"
              >
                {uiText.resetRequestAnother}
                <ArrowUpRight size={17} />
              </Link>
            </>
          ) : updated ? (
            <>
              <h1>{uiText.resetSuccessHeading}</h1>
              <p>{uiText.resetSuccessMessage}</p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {signedOut ? (
                <Link
                  className="button primary reset-link-button"
                  to="/moderator"
                >
                  {uiText.resetContinueToModerator}
                  <ArrowUpRight size={17} />
                </Link>
              ) : (
                <button
                  className="button primary reset-link-button"
                  onClick={signOutAndContinue}
                >
                  {uiText.resetContinueToModerator}
                  <ArrowUpRight size={17} />
                </button>
              )}
            </>
          ) : (
            <>
              <h1>{uiText.resetHeading}</h1>
              <p>{uiText.resetIntro}</p>
              <form onSubmit={updatePassword} noValidate>
                <label htmlFor="new-password">{uiText.resetNewPassword}</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "reset-error" : undefined}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setError("");
                  }}
                />
                <label htmlFor="confirm-password">
                  {uiText.resetConfirmPassword}
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "reset-error" : undefined}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                />
                <button
                  className="button primary"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? uiText.resetUpdating : uiText.resetUpdateAction}
                  {!busy && <ArrowUpRight size={17} />}
                </button>
                {error && (
                  <div className="error" id="reset-error" role="alert">
                    {error}
                  </div>
                )}
              </form>
            </>
          )}
        </section>
      </main>
    </>
  );
}

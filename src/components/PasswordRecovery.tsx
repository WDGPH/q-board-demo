import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  LockKeyhole,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { uiText } from "../lib/event";

export function PasswordRecovery() {
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setChecking(false);
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) {
        setHasRecoverySession(true);
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data: sessionData, error: sessionError }) => {
        if (sessionError) throw sessionError;
        if (active && sessionData.session) setHasRecoverySession(true);
      })
      .catch((sessionError: unknown) => {
        if (import.meta.env.DEV) console.error(sessionError);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
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
          {checking ? (
            <p role="status">{uiText.resetCheckingLink}</p>
          ) : !hasRecoverySession ? (
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

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, X } from "lucide-react";
import { uiText } from "../lib/event";

export function PasswordChangePage({
  backTo,
  onChangePassword,
}: {
  backTo: string;
  onChangePassword: (password: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") navigate(backTo);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [backTo, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (password !== confirmation) {
      setError(uiText.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await onChangePassword(password);
      setPassword("");
      setConfirmation("");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : uiText.passwordChangeFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="password-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) navigate(backTo);
      }}
    >
      <section
        className="login-panel password-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-change-heading"
      >
        <Link
          className="password-close"
          to={backTo}
          aria-label={uiText.closePasswordDialog}
          title={uiText.closePasswordDialog}
        >
          <X size={18} />
        </Link>
        <span className="login-icon">
          <KeyRound />
        </span>
        <div className="eyebrow">{uiText.moderatorEyebrow}</div>
        <h2 id="password-change-heading">{uiText.changePasswordHeading}</h2>
        <p>{uiText.changePasswordIntro}</p>
        <form onSubmit={submit}>
          <label htmlFor="new-password">{uiText.newPasswordLabel}</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <label htmlFor="confirm-password">
            {uiText.confirmPasswordLabel}
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <button className="button primary" disabled={busy}>
            {busy ? uiText.signingIn : uiText.savePassword}
          </button>
          <div className="error" role="alert">
            {error}
          </div>
          <div className="success" role="status">
            {saved ? uiText.passwordSaved : ""}
          </div>
        </form>
        <Link className="text-link" to={backTo}>
          {uiText.backToModerator}
        </Link>
      </section>
    </div>
  );
}
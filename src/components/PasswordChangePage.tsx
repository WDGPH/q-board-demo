import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { uiText } from "../lib/event";

export function PasswordChangePage({
  backTo,
  onChangePassword,
}: {
  backTo: string;
  onChangePassword: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
    <section className="login-panel password-panel">
      <span className="login-icon">
        <KeyRound />
      </span>
      <div className="eyebrow">{uiText.moderatorEyebrow}</div>
      <h2>{uiText.changePasswordHeading}</h2>
      <p>{uiText.changePasswordIntro}</p>
      <form onSubmit={submit}>
        <label htmlFor="new-password">{uiText.newPasswordLabel}</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
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
  );
}
import { statusLabels, uiText } from "../lib/event";
import { useState } from "react";
import { Check, EyeOff, Star } from "lucide-react";
import { StatusBadge } from "./QuestionCard";
import type { Question, Status } from "../types";
export function ModeratorCard({
  question: q,
  similarQuestions,
  onUpdate,
}: {
  question: Question;
  similarQuestions: Question[];
  onUpdate: (id: string, status: Status, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(q.moderator_note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  async function update(status: Status) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await onUpdate(q.id, status, note);
      setSaved(uiText.noteSaved);
    } catch (e) {
      setError(e instanceof Error ? e.message : uiText.saveFailed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="moderator-card">
      <div className="moderator-card-top">
        <StatusBadge status={q.status} />
        <span>
          {q.vote_count} {uiText.votesLabel} ·{" "}
          {new Date(q.created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
      <h3>{q.question_text}</h3>
      {similarQuestions.length > 0 && (
        <aside className="possible-matches" aria-label={uiText.possibleMatches}>
          <div className="possible-matches-heading">
            <strong>{uiText.possibleMatches}</strong>
            <span>{uiText.possibleMatchHint}</span>
          </div>
          <ul>
            {similarQuestions.map((match) => (
              <li key={match.id}>
                <p>{match.question_text}</p>
                <span>
                  {statusLabels[match.status]} · {match.vote_count}{" "}
                  {uiText.votesLabel}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <label htmlFor={`note-${q.id}`}>{uiText.moderatorNoteLabel}</label>
      <textarea
        id={`note-${q.id}`}
        value={note}
        maxLength={5000}
        onChange={(e) => setNote(e.target.value)}
        placeholder={uiText.moderatorNotePlaceholder}
        rows={2}
      />
      <div className="moderation-actions">
        {q.status !== "approved" && (
          <button
            disabled={busy}
            className="button primary small"
            onClick={() => update("approved")}
          >
            <Check size={15} />
            {uiText.approve}
          </button>
        )}
        {q.status !== "shortlisted" && (
          <button
            disabled={busy}
            className="button secondary small"
            onClick={() => update("shortlisted")}
          >
            <Star size={15} />
            {uiText.shortlist}
          </button>
        )}
        {q.status !== "answered" && (
          <button
            disabled={busy}
            className="button secondary small"
            onClick={() => update("answered")}
          >
            <Check size={15} />
            {uiText.markAnswered}
          </button>
        )}
        {q.status !== "hidden" && (
          <button
            disabled={busy}
            className="button subtle small"
            onClick={() => update("hidden")}
          >
            <EyeOff size={15} />
            {uiText.hide}
          </button>
        )}
        <button
          disabled={busy}
          className="button subtle small"
          onClick={() => update(q.status)}
        >
          {uiText.saveNote}
        </button>
      </div>
      <div className="error" role="alert">
        {error}
      </div>
      <div className="success" role="status">
        {saved}
      </div>
    </article>
  );
}

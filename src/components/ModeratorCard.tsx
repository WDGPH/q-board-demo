import { uiText } from "../lib/event";
import { useEffect, useState } from "react";
import { Check, EyeOff, Star } from "lucide-react";
import { StatusBadge } from "./QuestionCard";
import type { Question, Status } from "../types";
export function ModeratorCard({
  question: q,
  onUpdate,
}: {
  question: Question;
  onUpdate: (
    id: string,
    status: Status,
    note: string,
    expectedRevision: number,
  ) => Promise<number>;
}) {
  const [note, setNote] = useState(q.moderator_note || "");
  const [draftRevision, setDraftRevision] = useState(q.revision);
  const [noteDirty, setNoteDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const hasConflict = noteDirty && q.revision !== draftRevision;
  useEffect(() => {
    if (!noteDirty && q.revision !== draftRevision) {
      setDraftRevision(q.revision);
      setNote(q.moderator_note || "");
    }
  }, [q.revision, q.moderator_note, noteDirty, draftRevision]);
  async function update(status: Status) {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const revision = await onUpdate(q.id, status, note, draftRevision);
      setDraftRevision(revision);
      setNote(note.trim());
      setNoteDirty(false);
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
      <label htmlFor={`note-${q.id}`}>{uiText.moderatorNoteLabel}</label>
      <textarea
        id={`note-${q.id}`}
        value={note}
        maxLength={5000}
        onChange={(e) => {
          setNote(e.target.value);
          setNoteDirty(true);
        }}
        placeholder={uiText.moderatorNotePlaceholder}
        rows={2}
      />
      {hasConflict && (
        <div className="error" role="alert">
          {uiText.staleUpdate}{" "}
          <button
            className="button subtle small"
            onClick={() => {
              setNote(q.moderator_note || "");
              setNoteDirty(false);
              setDraftRevision(q.revision);
              setError("");
            }}
          >
            {uiText.reloadLatest}
          </button>
        </div>
      )}
      <div className="moderation-actions">
        {q.status !== "approved" && (
          <button
            disabled={busy || hasConflict}
            className="button primary small"
            onClick={() => update("approved")}
          >
            <Check size={15} />
            {uiText.approve}
          </button>
        )}
        {q.status !== "shortlisted" && (
          <button
            disabled={busy || hasConflict}
            className="button secondary small"
            onClick={() => update("shortlisted")}
          >
            <Star size={15} />
            {uiText.shortlist}
          </button>
        )}
        {(q.status === "approved" || q.status === "shortlisted") && (
          <button
            disabled={busy || hasConflict}
            className="button secondary small"
            onClick={() => update("answered")}
          >
            <Check size={15} />
            {uiText.markAnswered}
          </button>
        )}
        {q.status !== "hidden" && (
          <button
            disabled={busy || hasConflict}
            className="button subtle small"
            onClick={() => update("hidden")}
          >
            <EyeOff size={15} />
            {uiText.hide}
          </button>
        )}
        <button
          disabled={busy || hasConflict}
          className="button subtle small"
          onClick={() => update(q.status)}
        >
          {uiText.saveNote}
        </button>
      </div>
      {!hasConflict && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="success" role="status">
        {saved}
      </div>
    </article>
  );
}

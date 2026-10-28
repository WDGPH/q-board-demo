import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, RefreshCw, Undo2 } from "lucide-react";
import { uiText } from "../lib/event";
import { SessionSelector } from "./SessionSelector";
import { StatusBadge } from "./QuestionCard";
import type { Event, Question, Status } from "../types";

export function RankedView({
  event,
  questions,
  selectedSessionId,
  onSessionChange,
  moderatorLink,
  error,
  refreshing,
  onRefresh,
  onUpdate,
  preview,
}: {
  event: Event;
  questions: Question[];
  selectedSessionId: string | null;
  onSessionChange: (id: string) => void;
  moderatorLink: string;
  error: string;
  refreshing: boolean;
  onRefresh: () => void;
  onUpdate: (id: string, status: Status, note: string) => Promise<void>;
  preview: boolean;
}) {
  const sessions = event.sessions ?? [];
  const ranked = questions
    .filter(
      (q) =>
        (q.status === "shortlisted" ||
          q.status === "approved" ||
          q.status === "answered") &&
        (!sessions.length || (q.session_id ?? null) === selectedSessionId),
    )
    .sort((a, b) => {
      if (a.status === "answered" || b.status === "answered") {
        if (a.status !== b.status) return a.status === "answered" ? 1 : -1;
        return (
          Date.parse(a.answered_at ?? a.created_at) -
            Date.parse(b.answered_at ?? b.created_at) ||
          a.id.localeCompare(b.id)
        );
      }
      return (
        Number(b.status === "shortlisted") -
          Number(a.status === "shortlisted") ||
        b.vote_count - a.vote_count ||
        Date.parse(a.created_at) - Date.parse(b.created_at) ||
        a.id.localeCompare(b.id)
      );
    });
  const remaining = ranked.filter((q) => q.status !== "answered").length;
  return (
    <div className="ranked-view">
      <header className="ranked-header">
        <Link className="button secondary" to={moderatorLink}>
          <ArrowLeft size={18} /> {uiText.rankedBack}
        </Link>
        <button
          className="button secondary"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw size={18} className={refreshing ? "spin" : ""} />{" "}
          {uiText.refresh}
        </button>
      </header>
      <main className="ranked-main">
        {preview && <p className="ranked-preview">{uiText.previewNotice}</p>}
        <p className="ranked-event">{event.name}</p>
        <h1>{uiText.rankedHeading}</h1>
        <p className="ranked-intro">{uiText.rankedIntro}</p>
        <p className="ranked-updating">{uiText.rankedUpdating}</p>
        {error && (
          <div className="connection-error" role="alert">
            {error}
          </div>
        )}
        {sessions.length > 0 && (
          <SessionSelector
            compact
            sessions={sessions}
            selectedId={selectedSessionId}
            onChange={onSessionChange}
            showGeneral={questions.some((q) => !q.session_id)}
          />
        )}
        <p className="ranked-count" role="status">
          {(remaining === 1
            ? uiText.rankedRemainingOne
            : uiText.rankedRemaining
          ).replace("{count}", String(remaining))}
        </p>
        {ranked.length ? (
          <ol className="ranked-list" aria-label={uiText.rankedListLabel}>
            {ranked.map((q, index) => (
              <RankedQuestion
                key={q.id}
                question={q}
                rank={index + 1}
                onUpdate={onUpdate}
              />
            ))}
          </ol>
        ) : (
          <section className="empty-state">
            <h2>{uiText.rankedEmptyHeading}</h2>
            <p>{uiText.rankedEmptyText}</p>
          </section>
        )}
      </main>
    </div>
  );
}

function RankedQuestion({
  question: q,
  rank,
  onUpdate,
}: {
  question: Question;
  rank: number;
  onUpdate: (id: string, status: Status, note: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function answer() {
    setBusy(true);
    setError("");
    try {
      await onUpdate(
        q.id,
        q.status === "answered"
          ? (q.answered_from_status ?? "approved")
          : "answered",
        q.moderator_note ?? "",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : uiText.saveFailed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <li
      className={`ranked-card ${q.status === "shortlisted" ? "ranked-shortlisted" : q.status === "answered" ? "ranked-answered" : ""}`}
    >
      <span className="ranked-number" aria-hidden="true">
        {rank}
      </span>
      <article>
        <div className="ranked-meta">
          <StatusBadge status={q.status} />
          <span className="ranked-votes">
            <strong>{q.vote_count}</strong> {uiText.votesLabel}
          </span>
        </div>
        <h2>{q.question_text}</h2>
        {q.moderator_note && (
          <div className="ranked-note">
            <h3>{uiText.moderatorNoteLabel}</h3>
            <p>{q.moderator_note}</p>
          </div>
        )}
        <button className="button secondary" disabled={busy} onClick={answer}>
          {q.status === "answered" ? <Undo2 size={18} /> : <Check size={18} />}
          {q.status === "answered"
            ? uiText.unmarkAnswered
            : uiText.markAnswered}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </article>
    </li>
  );
}

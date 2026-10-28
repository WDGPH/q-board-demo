import { CalendarDays, ChevronDown, Info } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { EventSession } from "../types";
import { uiText } from "../lib/event";
import { sessionHasEnded } from "../lib/sessions";

export function sessionTime(session: EventSession) {
  const start = new Date(session.starts_at);
  const end = session.ends_at ? new Date(session.ends_at) : null;
  const format = (value: Date, includeDate = true) =>
    value.toLocaleString([], {
      ...(includeDate
        ? ({
            month: "short",
            day: "numeric",
          } as const)
        : {}),
      hour: "numeric",
      minute: "2-digit",
    });
  const sameDay =
    end &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  return `${format(start)}${end ? ` – ${format(end, !sameDay)}` : ""}`;
}

export function SessionSelector({
  sessions,
  selectedId,
  onChange,
  showGeneral,
  compact = false,
}: {
  sessions: EventSession[];
  selectedId: string | null;
  onChange: (id: string) => void;
  showGeneral: boolean;
  compact?: boolean;
}) {
  const [now, setNow] = useState(Date.now);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const selected = sessions.find((s) => s.id === selectedId);
  const selectedHasEnded = selected && sessionHasEnded(selected, now);
  const selector = (
    <select
      id="event-session"
      aria-label={uiText.sessionLabel}
      value={selectedId ?? ""}
      onChange={(e) => {
        onChange(e.target.value);
        setDetailsOpen(false);
      }}
    >
      {sessions.map((session) => (
        <option
          key={session.id}
          value={session.id}
          className={
            sessionHasEnded(session, now) ? "session-ended-option" : undefined
          }
        >
          {session.title}
          {!compact && ` · ${sessionTime(session)}`}
          {sessionHasEnded(session, now) ? " · Ended" : ""}
        </option>
      ))}
      {showGeneral && <option value="">{uiText.generalQuestions}</option>}
    </select>
  );
  const details = (
    <>
      <h2>{selected?.title ?? uiText.generalQuestions}</h2>
      {selected && (
        <p className="session-time">
          <CalendarDays size={15} aria-hidden="true" />
          <time dateTime={selected.starts_at}>{sessionTime(selected)}</time>
        </p>
      )}
      <p>{selected?.description ?? uiText.generalQuestionsDescription}</p>
    </>
  );
  if (compact) {
    return (
      <div
        className={`session-selector session-compact${selectedHasEnded ? " session-ended" : ""}`}
      >
        <div className="session-select-row">
          {selector}
          <button
            type="button"
            className="session-info-button"
            aria-label={uiText.sessionDetails}
            title={uiText.sessionDetails}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <Info size={20} aria-hidden="true" />
          </button>
        </div>
        <div id={detailsId} className="session-details" hidden={!detailsOpen}>
          {details}
        </div>
      </div>
    );
  }
  return (
    <details
      className={`session-selector${selectedHasEnded ? " session-ended" : ""}`}
    >
      <summary className="session-summary">
        <span className="session-summary-text">
          <span className="session-summary-label">{uiText.sessionLabel}</span>
          <span className="session-summary-title">
            {selected?.title ?? uiText.generalQuestions}
            {selectedHasEnded && (
              <span className="session-ended-label"> · Ended</span>
            )}
          </span>
        </span>
        <ChevronDown className="session-chevron" size={20} aria-hidden="true" />
      </summary>
      <div className="session-selector-content">
        <div className="session-select-row">{selector}</div>
        <div className="session-details">{details}</div>
      </div>
    </details>
  );
}

import { CalendarDays, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { EventSession } from "../types";
import { uiText } from "../lib/event";
import { sessionHasEnded } from "../lib/sessions";

function sessionTime(session: EventSession) {
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
}: {
  sessions: EventSession[];
  selectedId: string | null;
  onChange: (id: string) => void;
  showGeneral: boolean;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const selected = sessions.find((s) => s.id === selectedId);
  const selectedHasEnded = selected && sessionHasEnded(selected, now);
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
        <div className="session-select-row">
          <select
            id="event-session"
            aria-label={uiText.sessionLabel}
            value={selectedId ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {sessions.map((session) => (
              <option
                key={session.id}
                value={session.id}
                className={
                  sessionHasEnded(session, now)
                    ? "session-ended-option"
                    : undefined
                }
              >
                {session.title} · {sessionTime(session)}
                {sessionHasEnded(session, now) ? " · Ended" : ""}
              </option>
            ))}
            {showGeneral && <option value="">{uiText.generalQuestions}</option>}
          </select>
        </div>
        <div className="session-details">
          <h2>{selected?.title ?? uiText.generalQuestions}</h2>
          {selected && (
            <p className="session-time">
              <CalendarDays size={15} aria-hidden="true" />
              <time dateTime={selected.starts_at}>{sessionTime(selected)}</time>
            </p>
          )}
          <p>{selected?.description ?? uiText.generalQuestionsDescription}</p>
        </div>
      </div>
    </details>
  );
}

import { CalendarDays, ChevronDown } from "lucide-react";
import type { EventSession } from "../types";
import { uiText } from "../lib/event";

function sessionTime(session: EventSession) {
  const format = (value: string) =>
    new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    });
  return `${format(session.starts_at)}${session.ends_at ? ` – ${format(session.ends_at)}` : ""} UTC`;
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
  const selected = sessions.find((s) => s.id === selectedId);
  return (
    <details className="session-selector">
      <summary className="session-summary">
        <span className="session-summary-text">
          <span className="session-summary-label">{uiText.sessionLabel}</span>
          <span className="session-summary-title">
            {selected?.title ?? uiText.generalQuestions}
          </span>
        </span>
        <ChevronDown className="session-chevron" size={20} aria-hidden="true" />
      </summary>
      <div className="session-selector-content">
        <div className="session-select-row">
          <label htmlFor="event-session">{uiText.sessionLabel}</label>
          <select
            id="event-session"
            value={selectedId ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title} · {sessionTime(session)}
              </option>
            ))}
            {showGeneral && <option value="">{uiText.generalQuestions}</option>}
          </select>
        </div>
        <p className="session-intro">{uiText.sessionIntro}</p>
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

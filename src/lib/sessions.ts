import type { EventSession } from "../types";

export function sessionHasEnded(session: EventSession, now = Date.now()) {
  // A start time alone doesn't tell us when a session finishes.
  return Boolean(session.ends_at && Date.parse(session.ends_at) <= now);
}

export function defaultSession(sessions: EventSession[], now = Date.now()) {
  const scheduled = sessions
    .filter((session) => Number.isFinite(Date.parse(session.starts_at)))
    .slice()
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const current = scheduled.filter(
    (session) =>
      Date.parse(session.starts_at) <= now && !sessionHasEnded(session, now),
  );
  // Prefer the most recently started session when sessions overlap.
  return (
    current.at(-1) ??
    scheduled.find((session) => Date.parse(session.starts_at) > now) ??
    scheduled.at(-1) ??
    sessions[0]
  );
}

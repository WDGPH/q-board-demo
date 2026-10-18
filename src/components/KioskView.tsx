import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Maximize,
  MessageSquare,
  Pause,
  Play,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { sessionHasEnded } from "../lib/sessions";
import { sessionTime } from "./SessionSelector";
import type { Event, Question } from "../types";

export function KioskView({
  event,
  questions,
  selectedSessionId,
  onSessionChange,
  onExit,
  error,
  preview,
}: {
  event: Event;
  questions: Question[];
  selectedSessionId: string | null;
  onSessionChange: (id: string) => void;
  onExit: () => void;
  error: string;
  preview: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [now, setNow] = useState(Date.now);
  const sessions = event.sessions ?? [];
  const selected = sessions.find((s) => s.id === selectedSessionId);
  const publicQuestions = questions
    .filter(
      (q) =>
        ["approved", "shortlisted", "answered"].includes(q.status) &&
        (!sessions.length || (q.session_id ?? null) === selectedSessionId),
    )
    .sort(
      (a, b) =>
        b.vote_count - a.vote_count ||
        Date.parse(a.created_at) - Date.parse(b.created_at) ||
        a.id.localeCompare(b.id),
    );
  // One generous card per slide keeps even a 500-character question readable.
  const count = publicQuestions.length;
  const index = count ? page % count : 0;
  const question = publicQuestions[index];
  const participationUrl = new URL(
    `/e/${encodeURIComponent(event.slug)}`,
    window.location.origin,
  );
  if (selected) participationUrl.searchParams.set("session", selected.id);
  const url = participationUrl.toString();
  const sessionState = selected
    ? sessionHasEnded(selected, now)
      ? "Session ended"
      : Date.parse(selected.starts_at) > now
        ? "Coming up"
        : "In session"
    : "The conversation so far";

  useEffect(() => {
    setPage(0);
  }, [selectedSessionId]);
  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(
      () => setPage((p) => (p + 1) % count),
      16000,
    );
    return () => window.clearInterval(timer);
  }, [paused, count, selectedSessionId]);
  useEffect(() => {
    exitButton.current?.focus();
    const element = root.current;
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onExit();
    };
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    document.addEventListener("keydown", keydown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearInterval(timer);
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement === element)
        void document.exitFullscreen().catch(() => {});
    };
  }, [onExit]);

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else throw new Error();
      setFullscreenError("");
    } catch {
      setFullscreenError(
        "Full screen unavailable. Use your browser’s full screen option.",
      );
    }
  }

  return (
    <div className="kiosk" ref={root}>
      <header className="kiosk-header">
        <div className="kiosk-identity">
          <span className="kiosk-mark">
            <MessageSquare />
          </span>
          <span>{event.name}</span>
        </div>
        <div
          className={`kiosk-live${error ? " kiosk-offline" : ""}`}
          role="status"
        >
          <span />
          {error
            ? "Reconnecting · showing last update"
            : "Auto-updating · every 10s"}
        </div>
      </header>
      <main className="kiosk-stage">
        <section className="kiosk-conversation" aria-label="Audience questions">
          <div className="kiosk-kicker">
            {sessionState}
            <span>{String(count).padStart(2, "0")} questions on the board</span>
          </div>
          <h1>
            {selected?.title ??
              (sessions.length
                ? "General questions"
                : "A room full of curiosity.")}
          </h1>
          {selected && (
            <p className="kiosk-session-time">{sessionTime(selected)}</p>
          )}
          {question ? (
            <article key={question.id} className="kiosk-question">
              <div className="kiosk-card-top">
                <span>
                  {question.status === "answered" ? (
                    <>
                      <Check size={18} /> Answered
                    </>
                  ) : question.status === "shortlisted" ? (
                    "In the spotlight"
                  ) : (
                    "From the audience"
                  )}
                </span>
                <span>
                  <ArrowUp size={18} /> {question.vote_count} votes
                </span>
              </div>
              <p
                className={
                  question.question_text.length > 240
                    ? "kiosk-long-question"
                    : ""
                }
              >
                {question.question_text}
              </p>
              <div className="kiosk-card-bottom">
                <span>Anonymous question</span>
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(count).padStart(2, "0")}
                </span>
              </div>
            </article>
          ) : (
            <div className="kiosk-empty">
              <MessageSquare size={48} strokeWidth={1.3} />
              <h2>
                The next great question
                <br />
                could be yours.
              </h2>
              <p>
                Scan the code. Share your curiosity.
                <br />
                Questions appear here after review.
              </p>
            </div>
          )}
          <div className="kiosk-pagination">
            <span>
              {count > 1
                ? paused
                  ? "Rotation paused"
                  : "A new perspective every 16 seconds"
                : "Good questions start better conversations."}
            </span>
            <div>
              <button
                aria-label="Previous question"
                disabled={count < 2}
                onClick={() => setPage((index + count - 1) % count)}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                aria-label={paused ? "Resume rotation" : "Pause rotation"}
                aria-pressed={paused}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              <button
                aria-label="Next question"
                disabled={count < 2}
                onClick={() => setPage((index + 1) % count)}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </section>
        <aside className="kiosk-invitation">
          <span className="kiosk-invite-kicker">
            YOUR PERSPECTIVE BELONGS HERE
          </span>
          <h2>
            {event.is_active ? (
              <>
                What’s on
                <br />
                your mind<span>?</span>
              </>
            ) : (
              <>
                Keep the
                <br />
                ideas going<span>.</span>
              </>
            )}
          </h2>
          <p>
            {event.is_active
              ? "Ask a question. Vote for the ideas you want to hear more about."
              : "Submissions are closed. Explore the questions and perspectives shared so far."}
          </p>
          <a
            className="kiosk-qr"
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open the attendee question board"
          >
            <QRCodeSVG
              value={url}
              size={240}
              level="M"
              marginSize={4}
              bgColor="#ffffff"
              fgColor="#183b31"
            />
          </a>
          <strong>
            Scan to{" "}
            {event.is_active ? "join the conversation" : "explore the board"}{" "}
            <ArrowUp size={19} />
          </strong>
          <a className="kiosk-url" href={url} target="_blank" rel="noreferrer">
            {participationUrl.host}
            {participationUrl.pathname}
          </a>
          <small>Anonymous submissions · Reviewed by moderators</small>
        </aside>
      </main>
      <footer className="kiosk-controls">
        <span className="kiosk-footer-brand">
          qboard <span> / {preview ? "LOCAL PREVIEW" : "LIVE QUESTIONS"}</span>
        </span>
        <div className="kiosk-operator-controls">
          {sessions.length > 0 && (
            <select
              aria-label="Kiosk session"
              value={selectedSessionId ?? ""}
              onChange={(e) => onSessionChange(e.target.value)}
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {sessionHasEnded(s, now) ? " · Ended" : ""}
                </option>
              ))}
              {questions.some((q) => !q.session_id) && (
                <option value="">General questions</option>
              )}
            </select>
          )}
          <button onClick={fullscreen}>
            <Maximize size={16} /> Full screen
          </button>
          <button ref={exitButton} onClick={onExit}>
            <X size={17} /> Exit kiosk
          </button>
        </div>
      </footer>
      {fullscreenError && (
        <p className="kiosk-fullscreen-error" role="status">
          {fullscreenError}
        </p>
      )}
    </div>
  );
}

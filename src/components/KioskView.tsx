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
import { uiText } from "../lib/event";
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
  const [allSessions, setAllSessions] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [now, setNow] = useState(Date.now);
  const sessions = event.sessions ?? [];
  const selected = allSessions
    ? undefined
    : sessions.find((s) => s.id === selectedSessionId);
  const publicQuestions = questions
    .filter(
      (q) =>
        ["approved", "shortlisted", "answered"].includes(q.status) &&
        (allSessions ||
          !sessions.length ||
          (q.session_id ?? null) === selectedSessionId),
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
  const questionSession = sessions.find((s) => s.id === question?.session_id);
  const participationUrl = new URL(
    `/e/${encodeURIComponent(event.slug)}`,
    window.location.origin,
  );
  if (selected) participationUrl.searchParams.set("session", selected.id);
  const url = participationUrl.toString();
  const invitationHeading = event.is_active
    ? uiText.kioskInvitationHeading
    : uiText.kioskClosedHeading;
  const invitationPunctuation =
    invitationHeading.match(/[?!.？！。]$/)?.[0] ?? "";
  const sessionState = selected
    ? sessionHasEnded(selected, now)
      ? uiText.kioskSessionEnded
      : Date.parse(selected.starts_at) > now
        ? uiText.kioskComingUp
        : uiText.kioskInSession
    : uiText.kioskConversationSoFar;

  useEffect(() => {
    setPage(0);
  }, [selectedSessionId, allSessions]);
  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(
      () => setPage((p) => (p + 1) % count),
      16000,
    );
    return () => window.clearInterval(timer);
  }, [paused, count, selectedSessionId, allSessions]);
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
      setFullscreenError(uiText.kioskFullscreenUnavailable);
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
          {error ? uiText.kioskReconnecting : uiText.kioskUpdating}
        </div>
      </header>
      <main className="kiosk-stage">
        <section
          className="kiosk-conversation"
          aria-label={uiText.kioskQuestionsLabel}
        >
          <div className="kiosk-kicker">
            {sessionState}
            <span>
              {uiText.kioskQuestionCount.replaceAll(
                "{count}",
                String(count).padStart(2, "0"),
              )}
            </span>
          </div>
          <h1>
            {allSessions
              ? uiText.kioskAllSessions
              : (selected?.title ??
                (sessions.length
                  ? uiText.generalQuestions
                  : uiText.kioskHeading))}
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
                      <Check size={18} /> {uiText.statusAnswered}
                    </>
                  ) : question.status === "shortlisted" ? (
                    uiText.kioskSpotlight
                  ) : (
                    uiText.kioskFromAudience
                  )}
                </span>
                <span>
                  <ArrowUp size={18} /> {question.vote_count}{" "}
                  {uiText.votesLabel}
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
                <span>
                  {allSessions
                    ? (questionSession?.title ?? uiText.generalQuestions)
                    : uiText.kioskAnonymousQuestion}
                </span>
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(count).padStart(2, "0")}
                </span>
              </div>
            </article>
          ) : (
            <div className="kiosk-empty">
              <MessageSquare size={48} strokeWidth={1.3} />
              <h2 style={{ whiteSpace: "pre-line" }}>
                {uiText.kioskEmptyHeading}
              </h2>
              <p style={{ whiteSpace: "pre-line" }}>{uiText.kioskEmptyText}</p>
            </div>
          )}
          <div className="kiosk-pagination">
            <span>
              {count > 1
                ? paused
                  ? uiText.kioskRotationPaused
                  : uiText.kioskRotationHint
                : uiText.kioskConversationHint}
            </span>
            <div>
              <button
                aria-label={uiText.kioskPreviousQuestion}
                disabled={count < 2}
                onClick={() => setPage((index + count - 1) % count)}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                aria-label={
                  paused
                    ? uiText.kioskResumeRotation
                    : uiText.kioskPauseRotation
                }
                aria-pressed={paused}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </button>
              <button
                aria-label={uiText.kioskNextQuestion}
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
            {uiText.kioskInvitationEyebrow}
          </span>
          <h2 style={{ whiteSpace: "pre-line" }}>
            {invitationHeading.slice(
              0,
              invitationHeading.length - invitationPunctuation.length,
            )}
            <span>{invitationPunctuation}</span>
          </h2>
          <p>
            {event.is_active
              ? uiText.kioskInvitationText
              : uiText.kioskClosedText}
          </p>
          <a
            className="kiosk-qr"
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={uiText.kioskAttendeeBoardLabel}
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
            {event.is_active
              ? uiText.kioskScanToJoin
              : uiText.kioskScanToExplore}{" "}
            <ArrowUp size={19} />
          </strong>
          <a className="kiosk-url" href={url} target="_blank" rel="noreferrer">
            {participationUrl.host}
            {participationUrl.pathname}
          </a>
          <small>{uiText.kioskPrivacy}</small>
        </aside>
      </main>
      <footer className="kiosk-controls">
        <span className="kiosk-footer-brand">
          {uiText.brandPrefix}
          {uiText.brandSuffix}{" "}
          <span>
            {" "}
            / {preview ? uiText.kioskPreview : uiText.kioskLiveQuestions}
          </span>
        </span>
        <div className="kiosk-operator-controls">
          {sessions.length > 0 && (
            <select
              aria-label={uiText.kioskSessionLabel}
              value={
                allSessions
                  ? "all"
                  : selectedSessionId === null
                    ? "general"
                    : `session:${selectedSessionId}`
              }
              onChange={(e) => {
                const value = e.target.value;
                setAllSessions(value === "all");
                if (value !== "all")
                  onSessionChange(
                    value === "general" ? "" : value.slice("session:".length),
                  );
              }}
            >
              <option value="all">{uiText.kioskAllSessions}</option>
              {sessions.map((s) => (
                <option key={s.id} value={`session:${s.id}`}>
                  {s.title}
                  {sessionHasEnded(s, now)
                    ? ` · ${uiText.kioskEndedOption}`
                    : ""}
                </option>
              ))}
              {questions.some((q) => !q.session_id) && (
                <option value="general">{uiText.generalQuestions}</option>
              )}
            </select>
          )}
          <button onClick={fullscreen}>
            <Maximize size={16} /> {uiText.kioskFullscreen}
          </button>
          <button ref={exitButton} onClick={onExit}>
            <X size={17} /> {uiText.kioskExit}
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

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  useLocation,
  useNavigate,
  useParams,
  Routes,
  Route,
} from "react-router-dom";
import {
  MessageSquare,
  ArrowUpRight,
  CalendarDays,
  ArrowLeft,
  Download,
  LockKeyhole,
  RefreshCw,
  MessagesSquare,
} from "lucide-react";
import { supabase, preview, configurationError } from "./lib/supabase";
import { readDemo, saveDemo } from "./lib/demo";
import {
  configuredEvent,
  configureDatabaseEvent,
  uiText,
  statusLabels,
} from "./lib/event";
import { downloadCsv } from "./lib/csv";
import { defaultSession } from "./lib/sessions";
import { QuestionForm } from "./components/QuestionForm";
import { QuestionCard } from "./components/QuestionCard";
import { SessionSelector } from "./components/SessionSelector";
import { ModeratorCard } from "./components/ModeratorCard";
import { statuses, type Event, type Question, type Status } from "./types";

let sessionPromise: Promise<string> | undefined;
async function ensureSession(): Promise<string> {
  if (!supabase) return "preview";
  if (!sessionPromise)
    sessionPromise = (async () => {
      const { data, error } = await supabase!.auth.getSession();
      if (error) throw error;
      if (data.session) return data.session.user.id;
      const result = await supabase!.auth.signInAnonymously();
      if (result.error) throw result.error;
      return result.data.user!.id;
    })().finally(() => {
      sessionPromise = undefined;
    });
  return sessionPromise;
}
function Board() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const moderator = location.pathname.startsWith("/moderator");
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userId, setUserId] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState("top");
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [retry, setRetry] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setQuestions([]);
    setSelectedSessionId(null);
    setEvent(null);
    setAuthorized(false);
    setFilter("pending");
    setSort(moderator ? "newest" : "top");
    (async () => {
      if (configurationError) throw new Error(configurationError);
      if (preview) {
        if (slug && slug !== configuredEvent.slug)
          throw new Error(uiText.eventNotFound);
        if (!cancelled) {
          setEvent(configuredEvent);
          setSelectedSessionId(
            defaultSession(configuredEvent.sessions ?? [])?.id ?? null,
          );
          setUserId("preview");
          setQuestions(readDemo());
          setAuthorized(moderator);
        }
        return;
      }
      const id = await ensureSession();
      const role = await supabase!.rpc("is_moderator");
      if (role.error) throw role.error;
      let query = supabase!.from("events").select("*");
      query = query.eq("slug", slug ?? configuredEvent.slug);
      if (!moderator) query = query.eq("is_active", true);
      const result = await query.maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error(uiText.noActiveEvent);
      const allowed = Boolean(role.data);
      const data = await supabase!.rpc("list_questions", {
        p_event_id: result.data.id,
        p_moderator: moderator && allowed,
      });
      if (data.error) throw data.error;
      if (!cancelled) {
        const loadedEvent = configureDatabaseEvent(result.data);
        setEvent(loadedEvent);
        setSelectedSessionId(
          defaultSession(loadedEvent.sessions ?? [])?.id ?? null,
        );
        setUserId(id);
        setAuthorized(allowed);
        setQuestions(data.data || []);
      }
    })()
      .catch((e) => {
        if (!cancelled) setError(e.message || uiText.connectionFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, moderator, retry]);
  const refresh = useCallback(async () => {
    if (!event) return;
    if (preview) {
      setQuestions(readDemo());
      return;
    }
    const { data, error } = await supabase!.rpc("list_questions", {
      p_event_id: event.id,
      p_moderator: moderator && authorized,
    });
    if (error) throw error;
    setQuestions(data || []);
  }, [event, moderator, authorized]);
  useEffect(() => {
    if (!event) return;
    let active = true;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        refresh()
          .then(() => {
            if (active) setError("");
          })
          .catch(() => {
            if (active) setError(uiText.updatesPaused);
          });
    }, 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [event, refresh]);
  async function manualRefresh() {
    setRefreshing(true);
    try {
      await refresh();
      setError("");
    } catch {
      setError(uiText.refreshFailed);
    } finally {
      setRefreshing(false);
    }
  }
  const sessions = event?.sessions ?? [];
  const selectedSession =
    sessions.find((s) => s.id === selectedSessionId) ?? sessions[0];
  const sessionId =
    selectedSessionId === "" ? null : (selectedSession?.id ?? null);
  const sessionQuestions = sessions.length
    ? questions.filter((q) => (q.session_id ?? null) === sessionId)
    : questions;
  const legacyQuestions = questions.some((q) => !q.session_id);

  async function submit(text: string) {
    if (!event) return;
    if (preview) {
      const all = readDemo();
      if (all.filter((q) => q.id.startsWith("local-")).length >= 5)
        throw new Error(uiText.questionLimitReached);
      const next = [
        {
          id: `local-${crypto.randomUUID()}`,
          event_id: event.id,
          session_id: sessionId,
          question_text: text,
          status: "pending" as const,
          created_at: new Date().toISOString(),
          vote_count: 0,
          has_voted: false,
          moderator_note: null,
        },
        ...all,
      ];
      saveDemo(next);
      setQuestions(next);
      return;
    }
    const { error } = await supabase!.from("questions").insert({
      event_id: event.id,
      submitter_id: userId,
      ...(sessions.length ? { session_id: sessionId } : {}),
      question_text: text,
    });
    if (error)
      throw new Error(
        error.message.includes("limit of 5")
          ? error.message
          : uiText.submitFailed,
      );
  }
  async function vote(q: Question) {
    if (preview) {
      const next = readDemo().map((item) =>
        item.id === q.id
          ? {
              ...item,
              has_voted: !item.has_voted,
              vote_count: item.vote_count + (item.has_voted ? -1 : 1),
            }
          : item,
      );
      saveDemo(next);
      setQuestions(next);
      return;
    }
    const result = q.has_voted
      ? await supabase!
          .from("votes")
          .delete()
          .eq("question_id", q.id)
          .eq("voter_id", userId)
      : await supabase!.from("votes").insert({
          question_id: q.id,
          event_id: q.event_id,
          voter_id: userId,
        });
    if (result.error) throw result.error;
    setQuestions((all) =>
      all.map((item) =>
        item.id === q.id
          ? {
              ...item,
              has_voted: !q.has_voted,
              vote_count: Math.max(0, item.vote_count + (q.has_voted ? -1 : 1)),
            }
          : item,
      ),
    );
  }
  async function update(id: string, status: Status, note: string) {
    if (preview) {
      const next = readDemo().map((q) =>
        q.id === id ? { ...q, status, moderator_note: note } : q,
      );
      saveDemo(next);
      setQuestions(next);
      return;
    }
    const { error } = await supabase!.rpc("moderate_question", {
      p_id: id,
      p_status: status,
      p_note: note,
    });
    if (error) throw error;
    await refresh();
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const { error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const result = await supabase!.rpc("is_moderator");
      if (result.error) throw result.error;
      if (!result.data) throw new Error(uiText.moderatorAccessDenied);
      setPassword("");
      setRetry((n) => n + 1);
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : uiText.signInFailed);
    } finally {
      setLoginBusy(false);
    }
  }
  const base = slug ? `/e/${slug}` : "/";
  const modLink = slug ? `/moderator/${slug}` : "/moderator";
  const publicQuestions = sessionQuestions.filter((q) =>
    ["approved", "shortlisted", "answered"].includes(q.status),
  );
  const visible = (
    moderator
      ? sessionQuestions.filter((q) => filter === "all" || q.status === filter)
      : publicQuestions
  ).sort((a, b) =>
    sort === "newest"
      ? Date.parse(b.created_at) - Date.parse(a.created_at)
      : b.vote_count - a.vote_count ||
        Date.parse(a.created_at) - Date.parse(b.created_at),
  );
  return (
    <>
      <header className="site-header">
        <Link to={base} className="brand">
          <span className="brand-mark">
            <MessageSquare size={21} />
          </span>
          {uiText.brandPrefix}
          <span className="brand-light">{uiText.brandSuffix}</span>
          <span className="brand-divider" />
          <span className="brand-caption">{uiText.brandTagline}</span>
        </Link>
        <Link className="header-link" to={moderator ? base : modLink}>
          {moderator ? (
            <>
              <ArrowLeft size={15} />
              {uiText.questionBoardLink}
            </>
          ) : (
            <>
              {uiText.moderatorAccess}
              <ArrowUpRight size={15} />
            </>
          )}
        </Link>
      </header>
      {preview && (
        <div className="preview-banner">
          {uiText.previewNotice}{" "}
          <Link to={moderator ? base : modLink}>
            {moderator
              ? uiText.previewAttendeeLink
              : uiText.previewModeratorLink}
            <ArrowUpRight size={13} />
          </Link>
        </div>
      )}
      <main>
        {loading ? (
          <div className="state-panel" role="status">
            <RefreshCw className="spin" />
            {uiText.openingConversation}
          </div>
        ) : !event ? (
          <div className="state-panel">
            <h1>{uiText.connectionHeading}</h1>
            <p role="alert">{error}</p>
            <button
              className="button primary"
              onClick={() => setRetry((n) => n + 1)}
            >
              {uiText.retryConnection}
            </button>
          </div>
        ) : moderator && !authorized ? (
          <section className="login-panel">
            <span className="login-icon">
              <LockKeyhole />
            </span>
            <div className="eyebrow">{uiText.organizersEyebrow}</div>
            <h1>{uiText.moderatorAccess}</h1>
            <p>{uiText.signInIntro}</p>
            <form onSubmit={login}>
              <label htmlFor="email">{uiText.emailLabel}</label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="password">{uiText.passwordLabel}</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="button primary" disabled={loginBusy}>
                {loginBusy ? uiText.signingIn : uiText.signIn}
                <ArrowUpRight size={17} />
              </button>
              <div className="error" role="alert">
                {loginError}
              </div>
            </form>
            <Link className="text-link" to={base}>
              {uiText.backToBoard}
            </Link>
          </section>
        ) : (
          <>
            <section className="event-hero">
              <div className="event-detail">
                <span className="event-dot" />
                {event.name}
                {event.starts_at && (
                  <span className="event-date">
                    <CalendarDays size={14} />
                    {new Date(event.starts_at).toLocaleDateString([], {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                )}
              </div>
              <div className="hero-row">
                <div>
                  <h1>
                    {moderator ? (
                      uiText.moderatorHeading
                    ) : (
                      <MultilineText value={uiText.attendeeHeading} />
                    )}
                  </h1>
                  <p>{moderator ? uiText.moderatorIntro : event.description}</p>
                </div>
                <div className="hero-aside">
                  {moderator ? (
                    <>
                      <span className="eyebrow">{uiText.moderatorEyebrow}</span>
                      <button
                        className="button secondary"
                        onClick={() =>
                          downloadCsv(
                            sessionQuestions,
                            event.name,
                            event.slug,
                            sessions,
                          )
                        }
                      >
                        <Download size={16} />
                        {uiText.exportCsv}
                      </button>
                      {!preview && (
                        <button
                          className="text-link"
                          onClick={async () => {
                            const result = await supabase!.auth.signOut();
                            if (result.error) {
                              setError(uiText.signOutFailed);
                              return;
                            }
                            setAuthorized(false);
                            setQuestions([]);
                            navigate(base);
                          }}
                        >
                          {uiText.signOut}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="hero-symbol">
                        <MessagesSquare size={37} strokeWidth={1.25} />
                      </span>
                      <span>
                        <MultilineText value={uiText.attendeeAside} />
                      </span>
                    </>
                  )}
                </div>
              </div>
            </section>
            {error && (
              <div className="connection-error" role="alert">
                {error}
                <button onClick={manualRefresh}>{uiText.retry}</button>
              </div>
            )}
            {sessions.length > 0 && (
              <SessionSelector
                sessions={sessions}
                selectedId={sessionId}
                onChange={setSelectedSessionId}
                showGeneral={moderator && legacyQuestions}
              />
            )}
            {moderator ? (
              <section className="dashboard">
                <div className="summary-grid">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      className={filter === s ? "selected" : ""}
                      onClick={() => {
                        setFilter(s);
                        setSort(s === "shortlisted" ? "top" : "newest");
                      }}
                    >
                      <span>{statusLabels[s]}</span>
                      <strong>
                        {sessionQuestions.filter((q) => q.status === s).length}
                      </strong>
                    </button>
                  ))}
                </div>
                <div className="board-toolbar">
                  <div
                    className="status-tabs"
                    aria-label={uiText.filterQuestionsLabel}
                  >
                    {[...statuses, "all" as const].map((s) => (
                      <button
                        key={s}
                        aria-pressed={filter === s}
                        className={filter === s ? "active" : ""}
                        onClick={() => {
                          setFilter(s);
                          setSort(s === "shortlisted" ? "top" : "newest");
                        }}
                      >
                        {s === "all"
                          ? uiText.allStatuses
                          : s === "shortlisted"
                            ? uiText.shortlist
                            : statusLabels[s]}
                      </button>
                    ))}
                  </div>
                  <label className="sort-select">
                    {uiText.sortLabel}
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="newest">{uiText.sortNewest}</option>
                      <option value="top">{uiText.sortMostVotes}</option>
                    </select>
                  </label>
                </div>
                <div className="moderator-list">
                  {visible.length ? (
                    visible.map((q) => (
                      <ModeratorCard
                        key={q.id}
                        question={q}
                        onUpdate={update}
                      />
                    ))
                  ) : (
                    <Empty
                      title={uiText.moderatorEmptyHeading}
                      text={uiText.moderatorEmptyText}
                    />
                  )}
                </div>
              </section>
            ) : (
              <div className="attendee-layout">
                <aside>
                  <QuestionForm
                    key={sessionId ?? "general"}
                    onSubmit={submit}
                    disabled={!event.is_active}
                  />
                  <div className="how-it-works">
                    <span className="eyebrow">{uiText.guidanceEyebrow}</span>
                    <h3>{uiText.guidanceHeading}</h3>
                    <p>{uiText.guidanceVoting}</p>
                    <p>{uiText.guidancePanel}</p>
                  </div>
                </aside>
                <section className="board-section">
                  <div className="board-heading">
                    <h2>
                      {uiText.boardHeading}{" "}
                      <span>{publicQuestions.length}</span>
                    </h2>
                    <span className="live-label">
                      <span />
                      {uiText.updatesLabel}
                    </span>
                  </div>
                  <div className="board-toolbar">
                    <p>{uiText.boardIntro}</p>
                    <div
                      className="segmented"
                      aria-label={uiText.sortQuestionsLabel}
                    >
                      <button
                        className={sort === "top" ? "active" : ""}
                        aria-pressed={sort === "top"}
                        onClick={() => setSort("top")}
                      >
                        {uiText.sortTop}
                      </button>
                      <button
                        className={sort === "newest" ? "active" : ""}
                        aria-pressed={sort === "newest"}
                        onClick={() => setSort("newest")}
                      >
                        {uiText.sortNewest}
                      </button>
                    </div>
                  </div>
                  <div className="questions-list">
                    {visible.length ? (
                      visible.map((q) => (
                        <QuestionCard
                          key={q.id}
                          question={q}
                          onVote={() => vote(q)}
                        />
                      ))
                    ) : (
                      <Empty
                        title={uiText.attendeeEmptyHeading}
                        text={uiText.attendeeEmptyText}
                      />
                    )}
                  </div>
                  <div className="board-footer">
                    <ShieldNote />
                    <button
                      className="refresh-button"
                      disabled={refreshing}
                      onClick={manualRefresh}
                    >
                      <RefreshCw
                        size={14}
                        className={refreshing ? "spin" : ""}
                      />
                      {uiText.refresh}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <MessageSquare size={15} />
          {uiText.footerMessage}
        </span>
        <span>{uiText.footerPrivacy}</span>
      </footer>
    </>
  );
}
function MultilineText({ value }: { value: string }) {
  return value.split("\n").map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ));
}
function ShieldNote() {
  return <span>{uiText.reviewNotice}</span>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <MessageSquare size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/e/:slug" element={<Board />} />
        <Route path="/moderator" element={<Board />} />
        <Route path="/moderator/:slug" element={<Board />} />
        <Route
          path="*"
          element={
            <main className="state-panel">
              <h1>{uiText.pageNotFound}</h1>
              <Link to="/">{uiText.returnToBoard}</Link>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

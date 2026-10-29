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
  Monitor,
  ListOrdered,
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
import { KioskView } from "./components/KioskView";
import { PasswordRecovery } from "./components/PasswordRecovery";
import { RankedView } from "./components/RankedView";
import { statuses, type Event, type Question, type Status } from "./types";

let sessionPromise: Promise<string | null> | undefined;
async function ensureSession(): Promise<string | null> {
  if (window.location.pathname === "/reset-password") return null;
  if (!supabase) return "preview";
  if (!sessionPromise)
    sessionPromise = (async () => {
      const { data, error } = await supabase!.auth.getSession();
      if (error) throw error;
      if (data.session) return data.session.user.id;
      if (window.location.pathname === "/reset-password") return null;
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
  const ranked = moderator && location.pathname.endsWith("/ranked");
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userId, setUserId] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [kiosk, setKiosk] = useState(false);
  const exitKiosk = useCallback(() => setKiosk(false), []);
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
  const [requestingReset, setRequestingReset] = useState(false);
  const [resetRequestBusy, setResetRequestBusy] = useState(false);
  const [resetRequestMessage, setResetRequestMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setQuestions([]);
    setSelectedSessionId(null);
    setEvent(null);
    setAuthorized(false);
    setKiosk(false);
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
            configuredEvent.sessions?.find(
              (s) =>
                s.id === new URLSearchParams(location.search).get("session"),
            )?.id ??
              defaultSession(configuredEvent.sessions ?? [])?.id ??
              null,
          );
          setUserId("preview");
          setQuestions(readDemo());
          setAuthorized(moderator);
        }
        return;
      }
      const id = await ensureSession();
      if (!id) return;
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
          loadedEvent.sessions?.find(
            (s) => s.id === new URLSearchParams(location.search).get("session"),
          )?.id ??
            defaultSession(loadedEvent.sessions ?? [])?.id ??
            null,
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
    if (kiosk || ranked) {
      const role = await supabase!.rpc("is_moderator");
      if (role.error) throw role.error;
      if (!role.data) {
        setKiosk(false);
        setAuthorized(false);
        setQuestions([]);
        return;
      }
    }
    const { data, error } = await supabase!.rpc("list_questions", {
      p_event_id: event.id,
      p_moderator: moderator && authorized,
    });
    if (error) throw error;
    setQuestions(data || []);
  }, [event, moderator, authorized, kiosk, ranked]);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setKiosk(false);
        setAuthorized(false);
        setQuestions([]);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!event) return;
    let active = true;
    const timer = setInterval(
      () => {
        if (document.visibilityState === "visible")
          refresh()
            .then(() => {
              if (active) setError("");
            })
            .catch(() => {
              if (active) setError(uiText.updatesPaused);
            });
      },
      kiosk || ranked ? 10000 : 20000,
    );
    const resume = () => {
      if (document.visibilityState === "visible")
        refresh()
          .then(() => active && setError(""))
          .catch(() => active && setError(uiText.updatesPaused));
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("storage", resume);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("storage", resume);
    };
  }, [event, refresh, kiosk, ranked]);
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
  // Keep session choices shareable, including the legacy general-question list.
  useEffect(() => {
    if (!event) return;
    const params = new URLSearchParams(location.search);
    const requested = params.get("session");
    setSelectedSessionId(
      moderator && requested === ""
        ? ""
        : (event.sessions?.find((s) => s.id === requested)?.id ??
            defaultSession(event.sessions ?? [])?.id ??
            null),
    );
  }, [event, location.search, moderator]);
  function selectSession(id: string) {
    setSelectedSessionId(id);
    if (!moderator) return;
    const params = new URLSearchParams(location.search);
    params.set("session", id);
    navigate({ search: `?${params}` }, { replace: true });
  }

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
      const all = readDemo();
      // Preview samples can be dated ahead of the device clock. Append new
      // answers after that sample history, just as a live panel would.
      const answeredAt = new Date(
        Math.max(
          Date.now(),
          ...all
            .filter((q) => q.status === "answered")
            .map((q) => Date.parse(q.answered_at ?? q.created_at) + 1)
            .filter(Number.isFinite),
        ),
      ).toISOString();
      const next = all.map((q) =>
        q.id === id
          ? {
              ...q,
              status,
              moderator_note: note,
              answered_at:
                status === "answered"
                  ? q.status === "answered"
                    ? (q.answered_at ?? answeredAt)
                    : answeredAt
                  : null,
              answered_from_status:
                status === "answered"
                  ? q.status === "answered"
                    ? q.answered_from_status
                    : q.status === "shortlisted"
                      ? ("shortlisted" as const)
                      : ("approved" as const)
                  : null,
            }
          : q,
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
  async function requestPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setResetRequestBusy(true);
    setResetRequestMessage("");
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error && import.meta.env.DEV) console.error(error);
      }
      setResetRequestMessage(uiText.resetRequestConfirmation);
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      setResetRequestMessage(uiText.resetRequestConfirmation);
    } finally {
      setResetRequestBusy(false);
    }
  }
  const base = slug ? `/e/${slug}` : "/";
  const modLink = slug ? `/moderator/${slug}` : "/moderator";
  const sessionSearch = sessions.length
    ? `?${new URLSearchParams({ session: sessionId ?? "" })}`
    : "";
  if (ranked && !loading && authorized && event) {
    return (
      <RankedView
        event={event}
        questions={questions}
        selectedSessionId={sessionId}
        onSessionChange={selectSession}
        moderatorLink={`${modLink}${sessionSearch}`}
        error={error}
        refreshing={refreshing}
        onRefresh={manualRefresh}
        onUpdate={update}
        preview={preview}
      />
    );
  }
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
  if (kiosk && moderator && authorized && event) {
    return (
      <KioskView
        event={event}
        questions={questions}
        selectedSessionId={sessionId}
        onSessionChange={setSelectedSessionId}
        error={error}
        preview={preview}
        onExit={exitKiosk}
      />
    );
  }
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
            {requestingReset ? (
              <>
                <h1>{uiText.resetRequestHeading}</h1>
                <p>{uiText.resetRequestIntro}</p>
                <form
                  onSubmit={requestPasswordReset}
                  onChange={() => setResetRequestMessage("")}
                >
                  <label htmlFor="reset-email">{uiText.emailLabel}</label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button
                    className="button primary"
                    disabled={resetRequestBusy}
                  >
                    {resetRequestBusy
                      ? uiText.resetRequestSending
                      : uiText.resetRequestAction}
                  </button>
                  <div className="success" role="status">
                    {resetRequestMessage}
                  </div>
                </form>
                <button
                  className="text-link"
                  onClick={() => {
                    setRequestingReset(false);
                    setResetRequestMessage("");
                  }}
                >
                  {uiText.backToSignIn}
                </button>
              </>
            ) : (
              <>
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
                <button
                  className="text-link"
                  onClick={() => {
                    setRequestingReset(true);
                    setResetRequestMessage("");
                  }}
                >
                  {uiText.forgotPassword}
                </button>
                <Link className="text-link" to={base}>
                  {uiText.backToBoard}
                </Link>
              </>
            )}
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
                      <Link
                        className="button primary"
                        to={`${modLink}/ranked${sessionSearch}`}
                      >
                        <ListOrdered size={16} /> {uiText.openRanked}
                      </Link>
                      <button
                        className="button primary"
                        onClick={() => setKiosk(true)}
                      >
                        <Monitor size={16} /> {uiText.openKiosk}
                      </button>
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
                onChange={selectSession}
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
        <Route path="/reset-password" element={<PasswordRecovery />} />
        <Route path="/moderator/ranked" element={<Board />} />
        <Route path="/moderator/:slug/ranked" element={<Board />} />
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

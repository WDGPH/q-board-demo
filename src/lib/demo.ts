import type { Event, Question } from "../types";
export const demoEvent: Event = {
  id: "demo",
  name: "Public Health AI Symposium",
  slug: "public-health-ai-symposium",
  description:
    "Bringing public health and artificial intelligence into conversation.",
  starts_at: "2026-11-20T09:00:00Z",
  ends_at: "2026-11-20T17:00:00Z",
  is_active: true,
};
// Default UI copy. Override individual keys in event.config.ts under text.
export const demoText = {
  openKiosk: "Open kiosk",
  kioskSessionEnded: "Session ended",
  kioskComingUp: "Coming up",
  kioskInSession: "In session",
  kioskConversationSoFar: "The conversation so far",
  kioskFullscreenUnavailable:
    "Full screen unavailable. Use your browser’s full screen option.",
  kioskReconnecting: "Reconnecting · showing last update",
  kioskUpdating: "Auto-updating · every 10s",
  kioskQuestionsLabel: "Audience questions",
  // {count} is replaced with the number of public questions in the selected session.
  kioskQuestionCount: "{count} questions on the board",
  kioskHeading: "A room full of curiosity.",
  kioskSpotlight: "In the spotlight",
  kioskFromAudience: "From the audience",
  kioskAnonymousQuestion: "Anonymous question",
  kioskEmptyHeading: "The next great question\ncould be yours.",
  kioskEmptyText:
    "Scan the code. Share your curiosity.\nQuestions appear here after review.",
  kioskRotationPaused: "Rotation paused",
  kioskRotationHint: "A new perspective every 16 seconds",
  kioskConversationHint: "Good questions start better conversations.",
  kioskPreviousQuestion: "Previous question",
  kioskResumeRotation: "Resume rotation",
  kioskPauseRotation: "Pause rotation",
  kioskNextQuestion: "Next question",
  kioskInvitationEyebrow: "YOUR PERSPECTIVE BELONGS HERE",
  kioskInvitationHeading: "What’s on\nyour mind?",
  kioskClosedHeading: "Keep the\nideas going.",
  kioskInvitationText:
    "Ask a question. Vote for the ideas you want to hear more about.",
  kioskClosedText:
    "Submissions are closed. Explore the questions and perspectives shared so far.",
  kioskAttendeeBoardLabel: "Open the attendee question board",
  kioskScanToJoin: "Scan to join the conversation",
  kioskScanToExplore: "Scan to explore the board",
  kioskPrivacy: "Anonymous submissions · Reviewed by moderators",
  kioskPreview: "LOCAL PREVIEW",
  kioskLiveQuestions: "LIVE QUESTIONS",
  kioskSessionLabel: "Kiosk session",
  kioskAllSessions: "All sessions",
  kioskEndedOption: "Ended",
  kioskFullscreen: "Full screen",
  kioskExit: "Exit kiosk",
  sessionLabel: "Choose a Session",
  generalQuestions: "General questions",
  generalQuestionsDescription:
    "Questions submitted before sessions were configured.",
  eventNotFound: "This event could not be found.",
  noActiveEvent:
    "No active event was found. Please check the event link or contact the organizer.",
  connectionFailed: "Unable to connect. Please try again.",
  updatesPaused: "Updates are paused. Check your connection and retry.",
  refreshFailed: "Could not refresh questions. Please try again.",
  questionLimitReached:
    "You have reached the limit of 5 questions for this event.",
  submitFailed: "We couldn't submit your question. Please try again.",
  moderatorAccessDenied:
    "This account does not have moderator access. Contact your event organizer.",
  signInFailed: "Sign-in failed. Please retry.",
  previewAttendeeLink: "View attendee experience",
  previewModeratorLink: "Explore moderator dashboard",
  signingIn: "Signing in…",
  signIn: "Sign in",
  moderatorHeading: "Guide the conversation.",
  moderatorIntro:
    "Review questions, gather perspectives, and prepare your panel.",
  signOutFailed: "Sign out failed. Please retry.",
  allStatuses: "All",
  shortlist: "Shortlist",
  brandTagline: "GOOD QUESTIONS. BETTER CONVERSATIONS.",
  questionBoardLink: "Question board",
  moderatorAccess: "Moderator access",
  openingConversation: "Opening the conversation…",
  connectionHeading: "Let’s get connected",
  retryConnection: "Try again",
  organizersEyebrow: "FOR EVENT ORGANIZERS",
  signInIntro: "Sign in to help shape the conversation.",
  emailLabel: "Email address",
  passwordLabel: "Password",
  backToBoard: "Back to the question board",
  moderatorEyebrow: "MODERATOR WORKSPACE",
  exportCsv: "Export CSV",
  signOut: "Sign out",
  retry: "Retry",
  sortLabel: "Sort",
  sortNewest: "Newest",
  sortMostVotes: "Most votes",
  guidanceEyebrow: "A LITTLE GUIDANCE",
  guidanceHeading: "Keep the conversation open.",
  guidanceVoting:
    "Ask one clear question at a time. See a question that resonates? Give it an upvote.",
  guidancePanel:
    "Our moderators will bring a selection of your questions to the closing panel.",
  updatesLabel: "Updates every 20s",
  boardIntro: "Different perspectives. Shared curiosity.",
  sortTop: "Top",
  refresh: "Refresh",
  footerMessage: "Made for meaningful conversations.",
  footerPrivacy: "Anonymous by design. Thoughtful by nature.",
  reviewNotice: "All questions are reviewed by our moderators.",
  pageNotFound: "Page not found",
  returnToBoard: "Return to the question board",
  brandPrefix: "q",
  brandSuffix: "board",
  previewNotice: "Local preview · Changes stay in this browser.",
  attendeeHeading: "Big ideas start with\ngood questions.",
  attendeeAside: "A shared space for\ncurious minds.",
  filterQuestionsLabel: "Filter questions",
  sortQuestionsLabel: "Sort questions",
  moderatorEmptyHeading: "You’re all caught up.",
  moderatorEmptyText: "Questions with this status will appear here.",
  boardHeading: "The question board",
  attendeeEmptyHeading: "Every conversation starts somewhere.",
  attendeeEmptyText: "Submit a question. Once reviewed, it will appear here.",
  questionRequired: "Please enter a question.",
  questionTooLong: "Please keep your question to 500 characters.",
  questionSubmitted: "Your question has been submitted for review.",
  submitting: "Submitting…",
  submitQuestion: "Submit question",
  questionEyebrow: "MAKE ROOM FOR YOUR QUESTION",
  questionHeading: "What’s on your mind?",
  questionIntro: "Your perspective belongs in the conversation.",
  questionLabel: "Your question",
  questionPrivacy: "Please don’t include personal or confidential information.",
  questionReviewNotice:
    "Questions are reviewed before appearing on the board. Submissions are anonymous.",
  questionPlaceholder: "What would you like our panel to discuss?",
  removeVote: "Remove vote",
  upvote: "Upvote",
  voteFailed: "Vote failed. Please retry.",
  anonymousAttendee: "Anonymous attendee",
  noteSaved: "Saved.",
  saveFailed: "Could not save. Please retry.",
  moderatorNoteLabel: "Internal moderator note",
  approve: "Approve",
  markAnswered: "Mark answered",
  hide: "Hide",
  saveNote: "Save note",
  moderatorNotePlaceholder: "Add context for the panel…",
  votesLabel: "votes",
  statusPending: "Pending",
  statusApproved: "Approved",
  statusShortlisted: "Shortlisted",
  statusAnswered: "Answered",
  statusHidden: "Hidden",
  configurationError:
    "The event connection is not configured correctly. Please contact the organizer.",
};

const samples: [string, Question["status"], number][] = [
  [
    "How do we make sure AI tools reduce health inequalities, rather than reinforce them?",
    "shortlisted",
    24,
  ],
  [
    "What does meaningful community involvement look like when developing AI for public health?",
    "approved",
    18,
  ],
  [
    "How should we measure whether AI is actually improving outcomes, beyond saving time?",
    "approved",
    16,
  ],
  [
    "Where should we draw the line between automation and human judgment?",
    "shortlisted",
    12,
  ],
  [
    "What is one practical step a small public health team can take to get started responsibly?",
    "approved",
    9,
  ],
  [
    "How can we build public trust when the decisions made by an AI system are difficult to explain?",
    "answered",
    7,
  ],
  [
    "What skills will the next generation of public health professionals need?",
    "approved",
    5,
  ],
  [
    "How can local teams evaluate the quality of the data used to train these tools?",
    "pending",
    0,
  ],
  [
    "What governance should be in place before a pilot becomes a permanent service?",
    "pending",
    0,
  ],
  ["Can the panel share a specific vendor recommendation?", "hidden", 0],
];
export function initialDemo(): Question[] {
  return samples.map(([question_text, status, vote_count], i) => ({
    id: `demo-${i}`,
    event_id: "demo",
    question_text,
    status,
    vote_count,
    has_voted: false,
    created_at: new Date(Date.UTC(2026, 10, 20, 10, i * 4)).toISOString(),
    moderator_note:
      status === "shortlisted"
        ? "Invite perspectives from both research and practice."
        : null,
  }));
}
const storageKey = "q-board-preview-v1";
export function readDemo(): Question[] {
  try {
    return (
      JSON.parse(localStorage.getItem(storageKey) || "null") || initialDemo()
    );
  } catch {
    return initialDemo();
  }
}
export function saveDemo(questions: Question[]) {
  localStorage.setItem(storageKey, JSON.stringify(questions));
}

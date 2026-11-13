import type { EventConfig } from "./src/lib/event";

// Design and event details: https://phiz.ca/2026-symposium/
// Public frontend configuration; keep credentials out of this file.
const eventConfig: EventConfig = {
  name: "2026 AI Symposium",
  // Retain the existing event URL and database lookup slug.
  slug: "public-health-ai-symposium",
  description:
    "Hosted by Wellington-Dufferin-Guelph Public Health.",
  // November 20 is Eastern Standard Time (UTC−5). The hero displays the date in UTC.
  starts_at: "2026-11-20T13:30:00Z",
  ends_at: "2026-11-20T21:30:00Z",
  is_active: true,

  // Official program, November 20, 2026 (Eastern Standard Time, UTC−5).
  // End times follow the next published break, lunch, or adjournment.
  // Local preview uses this array. For a connected deployment, copy the same
  // sessions into this event's events.sessions field in Supabase (see README).
  // Keep IDs stable once questions have been submitted to a session.
  sessions: [
    {
      id: "plenary-1",
      title: "Plenary 1 · The Strategic Direction of Public Health",
      description:
        "A discussion of where the sector is headed and what AI and automation mean for its future. · Moderator: Dr. Michelle Murti.",
      starts_at: "2026-11-20T15:45:00Z",
      ends_at: "2026-11-20T17:05:00Z",
    },
    {
      id: "plenary-2",
      title: "Plenary 2 · Public Health Units in Practice: AI on the Ground",
      description:
        "Real deployments and lessons from Ontario health units using AI today. · Moderator: Dr. Hsiu-Li Wang.",
      starts_at: "2026-11-20T18:00:00Z",
      ends_at: "2026-11-20T19:15:00Z",
    },
    {
      id: "plenary-3",
      title:
        "Plenary 3 · Academic Leaders: Research Perspectives on AI in Public Health",
      description:
        "Research perspectives on population-scale sensing and surveillance, generative AI, and synthetic data for population health. · Moderator: Dr. Mustafa Hirji.",
      starts_at: "2026-11-20T19:35:00Z",
      ends_at: "2026-11-20T20:50:00Z",
    },
    {
      id: "future-readiness",
      title: "Panel · Future Readiness",
      description:
        "Practical first steps for moving from interest to implementation. · Moderator: Dr. Matthew Tenenbaum.",
      starts_at: "2026-11-20T21:00:00Z",
      ends_at: "2026-11-20T21:30:00Z",
    },
  ],
  text: {
    attendeeHeading:
      "The Future of Public Health:\nAI, Automation & What's Next",
    attendeeAside: "Innovate. Collaborate.\nShape the future.",
    sessionLabel: "Choose a session",
    questionEyebrow: "ASK THE PANEL",
    questionIntro: "Share a question for the panelists.",
    boardHeading: "Your Questions",
    kioskInvitationEyebrow: "2026 AI SYMPOSIUM",
    kioskInvitationText:
      "Scan to ask a question or vote for the topics you want to hear more about.",
    kioskEmptyHeading: "Help shape\nthe discussion.",
    kioskAllSessions: "Questions from the room",
    footerMessage:
      "2026 AI Symposium · Wellington-Dufferin-Guelph Public Health",
  },
};

export default eventConfig;
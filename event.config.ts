import type { EventConfig } from "./src/lib/event";

// Customize this deployment's event here. Uncomment only the fields you need.
// Omitted (or undefined) fields use the defaults in src/lib/demo.ts in preview.
// With Supabase, omitted details use the selected database event's values.
// This file is bundled into the public app: do not put secrets here.

const eventConfig: EventConfig = {
  // name: "My Conference",
  // slug: "my-conference", // Used by /, /moderator, and /e/my-conference.
  // description: "A place for attendees to ask questions and share ideas.",
  // starts_at: "2026-11-20T09:00:00Z", // ISO 8601; displayed in UTC.
  // ends_at: "2026-11-20T17:00:00Z",
  // is_active: true, // false disables the attendee submission form.
  // Use null for description or dates to hide them; false is not a fallback.
  // In Supabase, create an event with the same slug and close it in the DB too.

  // Optional sessions for local preview. Omit for one shared question list.
  // Connected events load sessions from events.sessions in Supabase (see README).
  // Use stable, unique IDs. Times are ISO 8601 and displayed in UTC.
  sessions: [
    //  {
    //    id: "opening-panel",
    //    title: "Opening panel",
    //    description: "Questions for our opening speakers.",
    //    starts_at: "2026-11-20T09:00:00Z",
    //    ends_at: "2026-11-20T10:00:00Z", // Optional.
    //  },
    //  {
    //    id: "closing-panel",
    //    title: "Closing panel",
    //    description: "Reflections and next steps.",
    //    starts_at: "2026-11-20T16:00:00Z",
    //  },
  ],

  // UI copy overrides apply throughout this deployment, in both modes.
  // Every available key and its default wording is in src/lib/demo.ts: demoText.
  // Override only what you need; omitted/undefined keys keep their defaults.
  // Empty strings are allowed. Text is plain text, not HTML.
  // Use \n for line breaks in attendeeHeading and attendeeAside.
  text: {
    //  brandTagline: "YOUR QUESTIONS. OUR NEXT CHAPTER.",
    //  attendeeHeading: "Welcome to our conference.",
    //  attendeeAside: "A space for\nnew perspectives.",
    //  questionHeading: "What would you like to ask?",
    //  questionPlaceholder: "Share a question for the speakers…",
    //  submitQuestion: "Send question",
    //  guidancePanel: "Our hosts will discuss your questions during the Q&A.",
    //  moderatorHeading: "Prepare the Q&A.",
    //  footerMessage: "Thanks for joining us.",
  },
};

export default eventConfig;

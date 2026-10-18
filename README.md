# Q Board

A mobile-first conference question board built with React, TypeScript, Vite, and Supabase. Attendees submit anonymous questions and toggle upvotes. Moderators review, approve, shortlist, hide, answer, add private notes, and export questions as CSV (for the selected session when sessions are enabled).

## Run locally

Requires Node.js 22.12+ (Node 24 used during development).

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL printed by Vite. With both Supabase variables empty, the app displays a **local preview** with sample content. Preview submissions, votes, and moderation persist in that browser’s local storage, and the moderator route is intentionally open. The banner always identifies this mode. This is for evaluation only; connect Supabase before inviting attendees. Clear site storage to reset the preview.

```bash
npm run build        # TypeScript check and production bundle in dist/
npm run preview      # Serve the production bundle
npm test             # Components, CSV, and PostgreSQL security tests
npm run test:browser # Desktop and 360px Chromium browser flows
```

Before the first browser test, run `npx playwright install chromium`. Browser tests expect blank Supabase variables, because they exercise the local preview. Unit and database tests do not need credentials or Docker.

## Connect Supabase

1. Create a Supabase project.
2. Under **Authentication → Providers / Sign In**, enable anonymous sign-ins. Enable email/password authentication for moderators. Disable public email sign-ups once you have created your moderator accounts; anonymous sign-ins are a separate setting.
3. Execute all files in [supabase/migrations](supabase/migrations) in filename order in the SQL editor as the database owner, once per database. Keep subsequent schema changes in new migration files. The SQL is also compatible with the Supabase CLI migration workflow.
4. In a **development project only**, execute [seed.sql](supabase/seed.sql). It creates an event, 10 questions across all statuses, six synthetic identities with no login credentials, and sample votes. It is safe to rerun. For production, create an empty event using the SQL below instead.
5. Create at least two email/password users using the Auth dashboard. Confirm their emails through the dashboard, then add their UUIDs as moderators:

   ```sql
   insert into public.moderator_users(user_id)
   values ('FIRST_AUTH_USER_UUID'), ('SECOND_AUTH_USER_UUID');
   ```

6. Copy the project URL and public anon key into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   ```

   The frontend must never contain a service-role/secret key. Environment files are ignored by Git. Restart Vite after changing environment variables.
7. Open `/` to create an anonymous attendee session. Open `/moderator` to sign in with a provisioned moderator account.

An anonymous attendee’s identity persists in browser storage. Clearing it, using private browsing, or changing browsers creates another identity. The five-question cap is per identity per event, not proof of a unique human. Supabase’s anonymous-auth abuse controls can be configured by the organizer if needed.

## Event setup and routes

Edit [event.config.ts](event.config.ts) at the repository root to customize an event without editing `src/`. Uncomment any of `name`, `slug`, `description`, `starts_at`, `ends_at`, or `is_active`. In local preview, omitted or `undefined` values fall back to [src/lib/demo.ts](src/lib/demo.ts). Set descriptions or dates to `null` to hide them; `false` closes the submission form. Restart Vite or rebuild/redeploy after changing the config. The file is public frontend configuration, so keep credentials out of it.

With Supabase, create an event with the configured slug (or the demo slug when omitted). The config selects the default event and overrides its provided details; omitted details retain the database values. Explicit links to other database events retain their own details. Database IDs and questions remain tied to the database event. To close a connected event, also set `is_active = false` in Supabase; frontend configuration does not change database permissions or update database records. Dates do not automatically open or close events.

The optional `text` section overrides standard component copy in both preview and connected mode. All keys and their current default wording are in `demoText` in [src/lib/demo.ts](src/lib/demo.ts), including headings, guidance, form labels, placeholders, buttons, status labels, accessibility labels, empty states, and app-generated messages. Override any subset; omitted or `undefined` keys use the defaults, while `""` intentionally clears text. Copy is plain text; `attendeeHeading` and `attendeeAside` support `\n` line breaks. Event descriptions still use `description`. These text overrides apply throughout the deployment, including explicit links to other events; they do not change limits, polling intervals, status values, or database error messages.

```ts
text: {
  attendeeHeading: "Welcome to our event.\nWhat’s on your mind?",
  questionPlaceholder: "Ask our speakers a question…",
  submitQuestion: "Send question",
  guidancePanel: "Selected questions will be discussed during the Q&A.",
},
```

```sql
insert into public.events(name,slug,description,starts_at,ends_at,is_active)
values (
  'Public Health AI Symposium',
  'public-health-ai-symposium',
  'Bringing public health and artificial intelligence into conversation.',
  '2026-11-20 09:00:00+00',
  '2026-11-20 17:00:00+00',
  true
);
```

- `/`: configured event (active events only for attendees).
- `/e/public-health-ai-symposium`: attendee event link; use this as the QR-code destination.
- `/moderator`: moderator dashboard for the configured event.
- `/moderator/public-health-ai-symposium`: event-specific dashboard; moderators can also review inactive events here.

Set `is_active = false` to close an event to attendees. Dates are descriptive; they do not automatically open or close submissions. Event dates are displayed in UTC; submission times use the moderator’s browser timezone. Moderator accounts have access to all events, as scoped for v1.

## Projector / kiosk view

Choose **Open kiosk** in the moderator panel. This view is available only inside the authorized panel (local preview intentionally grants moderator access). It displays approved, shortlisted, and answered questions; pending/hidden questions and moderator notes are excluded. Questions rotate every 16 seconds, with pause and previous/next controls. Updates arrive automatically every 10 seconds while visible; connection failures retain the last loaded board.

The display includes an attendee link and locally generated QR code, **Full screen**, and **Exit kiosk** (or Escape outside browser full screen). With sessions enabled, it starts with the moderator's selected session and includes a session selector, schedule, and ended/upcoming labels. QR destinations include the selected session; attendee links accept `?session=SESSION_ID`, with unknown IDs falling back to the normal default. Use the deployed event URL for attendees to scan from their own devices. The kiosk is designed for desktop and landscape tablet displays and scrolls when content needs more room.

## Optional sessions

Leave `sessions` out of the configuration for the existing single question list. To try multiple sessions locally, uncomment the `sessions` example in [event.config.ts](event.config.ts). Each session has a stable, unique `id`, a `title`, a `description`, and an ISO 8601 `starts_at` with timezone; `ends_at` is optional. Sessions appear in the configured order. The compact selector starts collapsed with the selected title; expand it for the dropdown, description, and times. Session times use the viewer's browser timezone and locale. Same-day ranges show the date once; ranges crossing local midnight show both dates. Dates describe the schedule and do not restrict submission times.

When the board loads, it uses the device clock to select the current session (the latest start wins if sessions overlap), then the earliest upcoming session, or the most recently started session if none remain. Manual choices stay selected while the board is open. Sessions with an elapsed `ends_at` are muted and labeled **Ended**, but remain selectable; this status refreshes every 30 seconds. Sessions without an end time are not marked ended. Supply end times for reliable defaults between sessions.

For connected events, apply [the sessions migration](supabase/migrations/202610080001_sessions.sql), then set `events.sessions` in Supabase. **Connected mode always uses database sessions**, including for the default event; the frontend `sessions` setting is for preview only. This keeps the choices and database validation in sync and lets explicit event links have their own sessions. For example:

```sql
update public.events
set sessions = '[
  {
    "id": "opening-panel",
    "title": "Opening panel",
    "description": "Questions for our opening speakers.",
    "starts_at": "2026-11-20T09:00:00Z",
    "ends_at": "2026-11-20T10:00:00Z"
  },
  {
    "id": "closing-panel",
    "title": "Closing panel",
    "description": "Reflections and next steps.",
    "starts_at": "2026-11-20T16:00:00Z"
  }
]'::jsonb
where slug = 'public-health-ai-symposium';
```

Attendees submit to the selected session and see only its public questions. Switching sessions resets the form, including unsent text and submission messages. Moderators use the same selector; status counts, review lists, and CSV exports cover the selected session. Session-enabled exports include session ID and title. Votes and notes stay attached to their original question. The five-question cap remains **per identity per event**, shared across sessions.

Existing questions retain a null session ID. When adding sessions to an event that already has questions, moderators can still review and export those under **General questions**; they do not appear on attendees’ session boards. If appropriate, assign them to a configured session as the database owner:

```sql
update public.questions
set session_id = 'opening-panel'
where event_id = (select id from public.events where slug = 'public-health-ai-symposium')
  and session_id is null;
```

The database rejects unknown sessions and requires a session on new questions for session-enabled events. Session IDs with questions cannot be removed or renamed; titles, descriptions, and times can be edited. Existing events default to `sessions = []` and need no additional setup. In preview, existing sample questions remain general questions rather than being assigned arbitrarily to a session.

## Security design

- RLS is enabled on all four tables. Explicit grants restrict API access.
- Question inserts permit only text, event ID, optional session ID, and the current submitter UUID. The database supplies pending status and timestamps.
- A database trigger enforces a five-question limit, with an advisory transaction lock to serialize concurrent submissions for the same identity/event.
- Attendees may read public questions and their own submissions, but cannot update or delete questions.
- **RLS alone does not hide columns.** `moderator_note` and submitter identities have no direct client SELECT grant. `list_questions` exposes safe fields and returns notes only after a database moderator check. `moderate_question` also checks moderator membership. Both functions use a fixed empty search path.
- Votes have a unique question/voter constraint, authenticated ownership checks, public-status checks, and a composite foreign key enforcing the question’s event. Attendees cannot enumerate other voter identities. Totals are derived by the authorized listing function.
- Attendees cannot add themselves to `moderator_users`.
- React renders question text as text; CSV export escapes quotes and neutralizes formula-like cells.
- Data updates are polled every 20 seconds while the page is visible. Submission failures retain the input; failed votes retain the previous state.

References: [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), and [column-level privileges](https://supabase.com/docs/guides/database/postgres/column-level-security).

## Deploy to Vercel

1. Push the repository to your Git host and import it into Vercel.
2. Choose the Vite preset: build command `npm run build`, output directory `dist`.
3. Set **both** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the production environment. They are embedded at build time, so redeploy after changes.
4. Run all migrations in your production Supabase project and create the event and moderator users as above. Do not load development seeds into production.
5. Deploy. `vercel.json` provides SPA rewrites so direct event and moderator links work.
6. Configure the HTTPS site URL in Supabase Auth. For a custom domain, add it in Vercel’s domain settings, apply the provided DNS records, and update the Supabase site URL.
7. Verify that the local-preview banner is absent, then carry out the launch checks below.

No application server is required. Other static hosts can serve `dist/` if all app routes fall back to `index.html`.

## Validation and launch checks

`npm test` runs the actual migration inside PGlite (embedded PostgreSQL), with an `auth.uid()` shim and the `authenticated`/`anon` roles. Tests exercise the real grants, RLS expressions, constraints, and functions, including forbidden moderation, note privacy, pending/hidden visibility, duplicate voting, five-question enforcement, status transitions, and repeatable seeds. This verifies database authorization but does **not** exercise hosted Supabase Auth, its REST API, or deployment configuration.

Browser tests cover preview submission → approval → upvote → shortlist → answered → CSV, persistence after reload, and 360px overflow checks.

Before using at a conference:

- Confirm two real moderator accounts can sign in over HTTPS.
- From separate browser profiles, submit a question, confirm persistence after reload, approve it, vote as a second attendee, shortlist it, mark it answered, and export the CSV.
- Verify the same workflow on iPhone Safari, Android Chrome, and desktop Chrome/Edge.
- Check direct API requests using an attendee token cannot read `moderator_note`, submit an approved status, invoke moderation, or list another attendee’s pending questions.
- Confirm inactive event handling and recovery after temporarily disconnecting the network.

## Scope notes

Implemented from [the v1 scope](conference_questions_v1_scope.md). Small implementation choices: password-based moderator login, 20-second polling instead of realtime, protected database functions for private-note reads and moderation, and a clearly labeled local preview for setup-free review. Preview storage is not used when Supabase is configured. Optional event sessions extend the original single-list workflow.

Hosted provisioning, public HTTPS deployment, hosted Auth/API verification, and physical-device checks require an organizer’s environment and remain launch tasks. Google Fonts enhances typography; system font fallbacks keep the app usable if the font service is unavailable.

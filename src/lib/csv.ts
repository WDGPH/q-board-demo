import type { EventSession, Question } from "../types";
// Spreadsheet applications may execute cells beginning with formula characters.
function cell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function makeCsv(
  questions: Question[],
  eventName: string,
  sessions: EventSession[] = [],
) {
  return (
    "\uFEFF" +
    [
      [
        "question_id",
        "event_name",
        ...(sessions.length ? ["session_id", "session_title"] : []),
        "question_text",
        "status",
        "vote_count",
        "created_at",
        "moderator_note",
      ],
      ...questions.map((q) => [
        q.id,
        eventName,
        ...(sessions.length
          ? [q.session_id, sessions.find((s) => s.id === q.session_id)?.title]
          : []),
        q.question_text,
        q.status,
        q.vote_count,
        q.created_at,
        q.moderator_note,
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
export function downloadCsv(
  questions: Question[],
  eventName: string,
  slug: string,
  sessions: EventSession[] = [],
) {
  const url = URL.createObjectURL(
    new Blob([makeCsv(questions, eventName, sessions)], {
      type: "text/csv;charset=utf-8;",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-questions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

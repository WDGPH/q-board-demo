export const statuses = [
  "pending",
  "approved",
  "shortlisted",
  "answered",
  "hidden",
] as const;
export type Status = (typeof statuses)[number];
export type EventSession = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string | null;
};
export type Event = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sessions?: EventSession[];
};
export type Question = {
  id: string;
  event_id: string;
  session_id?: string | null;
  question_text: string;
  status: Status;
  created_at: string;
  vote_count: number;
  has_voted: boolean;
  moderator_note: string | null;
};

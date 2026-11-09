create policy moderators_receive_question_broadcasts
on realtime.messages for select to authenticated
using (public.is_moderator() and realtime.topic() like 'moderators:%');

create function public.broadcast_question_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  question_id uuid;
  question_event_id uuid;
  notification_row public.questions;
begin
  if tg_op = 'DELETE' then
    question_id := old.id;
    question_event_id := old.event_id;
  else
    question_id := new.id;
    question_event_id := new.event_id;
  end if;

  notification_row := pg_catalog.jsonb_populate_record(
    null::public.questions,
    pg_catalog.jsonb_build_object('id', question_id, 'event_id', question_event_id)
  );

  perform realtime.broadcast_changes(
    'moderators:' || question_event_id::text,
    'question_changed',
    tg_op,
    tg_table_name,
    tg_table_schema,
    notification_row,
    null::public.questions
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function public.broadcast_question_change() from public, anon, authenticated;

create trigger broadcast_question_changes
after insert or update or delete on public.questions
for each row execute function public.broadcast_question_change();
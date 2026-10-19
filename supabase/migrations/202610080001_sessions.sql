-- Optional sessions are owned by each event. Existing events and questions stay valid.
create function public.valid_event_sessions(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb; ids text[] := '{}';
begin
 if jsonb_typeof(value) <> 'array' then return false; end if;
 for item in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(item) <> 'object'
   or jsonb_typeof(item->'id') is distinct from 'string'
   or btrim(item->>'id') = '' or (item->>'id') = any(ids)
   or jsonb_typeof(item->'title') is distinct from 'string' or btrim(item->>'title') = ''
   or jsonb_typeof(item->'description') is distinct from 'string'
   or jsonb_typeof(item->'starts_at') is distinct from 'string'
   or (item->>'starts_at') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(Z|[+-]\d{2}:\d{2})$'
  then return false; end if;
  perform (item->>'starts_at')::timestamptz;
  if item->>'ends_at' is not null then
   if jsonb_typeof(item->'ends_at') <> 'string'
    or (item->>'ends_at') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(Z|[+-]\d{2}:\d{2})$'
    or (item->>'ends_at')::timestamptz < (item->>'starts_at')::timestamptz
   then return false; end if;
  end if;
  ids := array_append(ids, item->>'id');
 end loop;
 return true;
exception when others then return false;
end;
$$;
revoke all on function public.valid_event_sessions(jsonb) from public, anon;
grant execute on function public.valid_event_sessions(jsonb) to authenticated;
alter table public.events add column sessions jsonb not null default '[]'::jsonb
 check (public.valid_event_sessions(sessions));
alter table public.questions add column session_id text;
create index questions_event_session on public.questions(event_id, session_id);
grant select (session_id) on public.questions to authenticated;
grant insert (session_id) on public.questions to authenticated;

create function public.guard_question_session() returns trigger
language plpgsql security definer set search_path = '' as $$
declare configured jsonb;
begin
 -- Share-lock the event so session configuration cannot change during an insert.
 select sessions into configured from public.events where id = new.event_id for share;
 if new.session_id is not null then
  if not exists (select 1 from jsonb_array_elements(configured) s where s->>'id' = new.session_id) then
   raise exception 'Session does not belong to this event.' using errcode='23514';
  end if;
 elsif jsonb_array_length(configured) > 0 then
  raise exception 'Please select a session for this event.' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.guard_question_session() from public, anon, authenticated;
create trigger validate_question_session before insert or update of session_id, event_id
 on public.questions for each row execute function public.guard_question_session();

-- Session titles/times can change, but IDs with questions must remain available.
create function public.guard_event_sessions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if exists (select 1 from public.questions q where q.event_id = new.id and q.session_id is not null
  and not exists (select 1 from jsonb_array_elements(new.sessions) s where s->>'id' = q.session_id)) then
  raise exception 'Cannot remove a session that has questions.' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.guard_event_sessions() from public, anon, authenticated;
create trigger preserve_question_sessions before update of sessions on public.events
 for each row execute function public.guard_event_sessions();

-- Keep the RPC arguments compatible while adding the session to its safe fields.
drop function public.list_questions(uuid, boolean);
create function public.list_questions(p_event_id uuid, p_moderator boolean default false)
returns table(id uuid,event_id uuid,question_text text,status text,created_at timestamptz,vote_count bigint,has_voted boolean,moderator_note text,session_id text)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_moderator and not public.is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 return query select q.id,q.event_id,q.question_text,q.status,q.created_at,
 (select count(*) from public.votes v where v.question_id=q.id),
 exists(select 1 from public.votes v where v.question_id=q.id and v.voter_id=auth.uid()),
 case when p_moderator then q.moderator_note else null::text end, q.session_id
 from public.questions q join public.events e on e.id=q.event_id
 where q.event_id=p_event_id and (p_moderator or (e.is_active and q.status in ('approved','shortlisted','answered')));
end;
$$;
revoke all on function public.list_questions(uuid,boolean) from public, anon;
grant execute on function public.list_questions(uuid,boolean) to authenticated;

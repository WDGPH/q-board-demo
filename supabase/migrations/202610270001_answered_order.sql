-- Persist the answer sequence and the queue to restore when undoing an answer.
alter table public.questions add column answered_from_status text
 check (answered_from_status in ('approved','shortlisted'));

create or replace function public.moderate_question(p_id uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 update public.questions set status=p_status, moderator_note=nullif(btrim(p_note),''), updated_at=now(),
 approved_at=case when p_status in ('approved','shortlisted','answered') then coalesce(approved_at,now()) else approved_at end,
 shortlisted_at=case when p_status='shortlisted' then coalesce(shortlisted_at,now()) else shortlisted_at end,
 answered_at=case when p_status='answered' then
   case when status='answered' then coalesce(answered_at,now()) else now() end
   else null end,
 answered_from_status=case when p_status='answered' then
   case when status='answered' then answered_from_status
     when status='shortlisted' then 'shortlisted' else 'approved' end
   else null end
 where id=p_id;
 if not found then raise exception 'Question no longer exists'; end if;
end;
$$;

drop function public.list_questions(uuid, boolean);
create function public.list_questions(p_event_id uuid, p_moderator boolean default false)
returns table(id uuid,event_id uuid,question_text text,status text,created_at timestamptz,vote_count bigint,has_voted boolean,moderator_note text,session_id text,answered_at timestamptz,answered_from_status text)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_moderator and not public.is_moderator() then raise exception 'Moderator access required' using errcode='42501'; end if;
 return query select q.id,q.event_id,q.question_text,q.status,q.created_at,
 (select count(*) from public.votes v where v.question_id=q.id),
 exists(select 1 from public.votes v where v.question_id=q.id and v.voter_id=auth.uid()),
 case when p_moderator then q.moderator_note else null::text end, q.session_id,
 q.answered_at, case when p_moderator then q.answered_from_status else null::text end
 from public.questions q join public.events e on e.id=q.event_id
 where q.event_id=p_event_id and (p_moderator or (e.is_active and q.status in ('approved','shortlisted','answered')));
end;
$$;
revoke all on function public.list_questions(uuid,boolean) from public, anon;
grant execute on function public.list_questions(uuid,boolean) to authenticated;

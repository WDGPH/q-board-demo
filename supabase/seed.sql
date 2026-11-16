-- DEVELOPMENT ONLY. Run after the migration, never against a live event.
-- Sample auth identities have no login credentials and exist only to own fixture rows.
insert into auth.users(id, aud, role, is_anonymous, created_at, updated_at)
select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, 'authenticated','authenticated',true,now(),now()
from generate_series(1,6) n on conflict(id) do nothing;
insert into public.events(id,name,slug,description,starts_at,ends_at,is_active)
values('10000000-0000-4000-8000-000000000001','Public Health AI Symposium','dev-event','Bringing public health and artificial intelligence into conversation.','2026-11-20 09:00:00+00','2026-11-20 17:00:00+00',true)
on conflict(id) do nothing;
insert into public.questions(id,event_id,submitter_id,question_text,status,moderator_note,created_at,approved_at,shortlisted_at,answered_at)
select ('20000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001',
('00000000-0000-4000-8000-' || lpad((1+(n-1)/5)::text,12,'0'))::uuid, body, state,
case when state='shortlisted' then 'Invite perspectives from research and practice.' else null end,
'2026-11-20 10:00:00+00'::timestamptz + n * interval '4 minutes',
case when state in ('approved','shortlisted','answered') then now() end,
case when state='shortlisted' then now() end, case when state='answered' then now() end
from (values
(1,'How do we make sure AI tools reduce health inequalities, rather than reinforce them?','shortlisted'),
(2,'What does meaningful community involvement look like when developing AI for public health?','approved'),
(3,'How should we measure whether AI is actually improving outcomes, beyond saving time?','approved'),
(4,'Where should we draw the line between automation and human judgment?','shortlisted'),
(5,'What is one practical step a small public health team can take to get started responsibly?','approved'),
(6,'How can we build public trust when AI decisions are difficult to explain?','answered'),
(7,'What skills will the next generation of public health professionals need?','approved'),
(8,'How can local teams evaluate the quality of training data?','pending'),
(9,'What governance should be in place before a pilot becomes a permanent service?','pending'),
(10,'Can the panel share a specific vendor recommendation?','hidden')
) as sample(n,body,state)
where not exists(select 1 from public.questions q where q.id=('20000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid);
insert into public.votes(question_id,event_id,voter_id)
select q.id,q.event_id,('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
from public.questions q cross join generate_series(1,6) n
where q.event_id='10000000-0000-4000-8000-000000000001' and q.status in ('approved','shortlisted','answered') and n <= (1 + ascii(right(q.id::text,1)) % 6)
on conflict(question_id,voter_id) do nothing;

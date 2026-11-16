-- Run the schema query as the database owner before deployment.
-- Stop if any ok value is false. Compare definitions with the migration files.
-- These checks inspect the final schema. They do not prove migration history.
with
required_tables(name) as (
  values ('public.events'), ('public.questions'), ('public.votes'),
    ('public.moderator_users'), ('realtime.messages')
),
required_columns(table_name, column_name, type_name, not_null) as (
  values
    ('events', 'id', 'uuid', true),
    ('events', 'name', 'text', true),
    ('events', 'slug', 'text', true),
    ('events', 'description', 'text', false),
    ('events', 'starts_at', 'timestamp with time zone', false),
    ('events', 'ends_at', 'timestamp with time zone', false),
    ('events', 'is_active', 'boolean', true),
    ('events', 'created_at', 'timestamp with time zone', true),
    ('events', 'sessions', 'jsonb', true),
    ('moderator_users', 'user_id', 'uuid', true),
    ('moderator_users', 'created_at', 'timestamp with time zone', true),
    ('questions', 'id', 'uuid', true),
    ('questions', 'event_id', 'uuid', true),
    ('questions', 'submitter_id', 'uuid', true),
    ('questions', 'question_text', 'text', true),
    ('questions', 'status', 'text', true),
    ('questions', 'moderator_note', 'text', false),
    ('questions', 'created_at', 'timestamp with time zone', true),
    ('questions', 'updated_at', 'timestamp with time zone', true),
    ('questions', 'approved_at', 'timestamp with time zone', false),
    ('questions', 'shortlisted_at', 'timestamp with time zone', false),
    ('questions', 'answered_at', 'timestamp with time zone', false),
    ('questions', 'session_id', 'text', false),
    ('questions', 'answered_from_status', 'text', false),
    ('questions', 'revision', 'bigint', true),
    ('votes', 'id', 'uuid', true),
    ('votes', 'question_id', 'uuid', true),
    ('votes', 'event_id', 'uuid', true),
    ('votes', 'voter_id', 'uuid', true),
    ('votes', 'created_at', 'timestamp with time zone', true)
),
required_rpcs(signature, argument_names, result_type, defaults) as (
  values
    ('public.is_moderator()', array[]::text[], 'boolean', 0),
    ('public.moderate_question(uuid,text,text,bigint)',
      array['p_id','p_status','p_note','p_expected_revision'], 'bigint', 0),
    ('public.list_questions(uuid,boolean)', array['p_event_id','p_moderator'],
      'TABLE(id uuid, event_id uuid, question_text text, status text, created_at timestamp with time zone, vote_count bigint, has_voted boolean, moderator_note text, session_id text, answered_at timestamp with time zone, answered_from_status text, revision bigint)', 1)
),
required_policies(table_name, name, command) as (
  values
    ('public.events', 'events_read', 'r'),
    ('public.questions', 'questions_read', 'r'),
    ('public.questions', 'questions_insert', 'a'),
    ('public.questions', 'questions_update', 'w'),
    ('public.votes', 'votes_read', 'r'),
    ('public.votes', 'votes_insert', 'a'),
    ('public.votes', 'votes_delete', 'd'),
    ('public.moderator_users', 'moderators_read', 'r'),
    ('realtime.messages', 'moderators_receive_question_broadcasts', 'r')
),
required_triggers(table_name, name, function_name, trigger_type) as (
  values
    ('public.questions', 'limit_submissions', 'public.guard_question_insert()', 7),
    ('public.questions', 'validate_question_session', 'public.guard_question_session()', 23),
    ('public.events', 'preserve_question_sessions', 'public.guard_event_sessions()', 19),
    ('public.questions', 'broadcast_question_changes', 'public.broadcast_question_change()', 29)
),
required_constraints(table_name, name) as (
  values
    ('events', 'events_pkey'), ('events', 'events_slug_key'),
    ('events', 'events_sessions_check'),
    ('questions', 'questions_pkey'), ('questions', 'questions_id_event_id_key'),
    ('questions', 'questions_event_id_fkey'), ('questions', 'questions_submitter_id_fkey'),
    ('questions', 'questions_question_text_check'), ('questions', 'questions_status_check'),
    ('questions', 'questions_moderator_note_check'),
    ('questions', 'questions_answered_from_status_check'), ('questions', 'questions_revision_check'),
    ('votes', 'votes_pkey'), ('votes', 'votes_event_id_fkey'),
    ('votes', 'votes_voter_id_fkey'), ('votes', 'votes_question_id_event_id_fkey'),
    ('votes', 'votes_question_id_voter_id_key'),
    ('moderator_users', 'moderator_users_pkey'), ('moderator_users', 'moderator_users_user_id_fkey')
),
roles as (
  select
    (select oid from pg_catalog.pg_roles where rolname = 'authenticated') as authenticated,
    (select oid from pg_catalog.pg_roles where rolname = 'anon') as anon
),
checks(check_id, ok, details) as (
  select 'table.' || t.name, coalesce(c.relkind = 'r' and c.relrowsecurity, false),
    'Required table with RLS enabled'
  from required_tables t
  left join pg_catalog.pg_class c on c.oid = to_regclass(t.name)
  union all
  select 'column.' || r.table_name || '.' || r.column_name,
    coalesce(format_type(a.atttypid, a.atttypmod) = r.type_name and a.attnotnull = r.not_null, false),
    format('Expected %s, not_null=%s; actual %s, not_null=%s; default=%s',
      r.type_name, r.not_null, format_type(a.atttypid, a.atttypmod), a.attnotnull,
      pg_get_expr(d.adbin, d.adrelid))
  from required_columns r
  left join pg_catalog.pg_attribute a on a.attrelid = to_regclass('public.' || r.table_name)
    and a.attname = r.column_name and a.attnum > 0 and not a.attisdropped
  left join pg_catalog.pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  union all
  select 'rpc.' || r.signature,
    coalesce(p.oid is not null
      and coalesce(p.proargnames[1:p.pronargs], array[]::text[]) = r.argument_names
      and pg_get_function_result(p.oid) = r.result_type
      and p.pronargdefaults = r.defaults
      and (r.defaults = 0 or pg_get_expr(p.proargdefaults, 0) = 'false')
      and p.prosecdef and p.proconfig @> array['search_path=""']
      and roles.authenticated is not null and roles.anon is not null
      and has_function_privilege(roles.authenticated, p.oid, 'EXECUTE')
      and not has_function_privilege(roles.anon, p.oid, 'EXECUTE')
      and not exists (
        select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      ), false),
    pg_get_functiondef(p.oid)
  from required_rpcs r cross join roles
  left join pg_catalog.pg_proc p on p.oid = to_regprocedure(r.signature)
  union all
  select 'rpc.legacy_moderate_question_absent',
    to_regprocedure('public.moderate_question(uuid,text,text)') is null,
    'The current app requires p_expected_revision. Investigate any legacy overload.'
  union all
  select 'policy.' || r.name,
    coalesce(p.polcmd::text = r.command and p.polpermissive
      and p.polroles = array[roles.authenticated] and roles.authenticated is not null, false),
    format('USING (%s); WITH CHECK (%s)',
      pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid))
  from required_policies r cross join roles
  left join pg_catalog.pg_policy p on p.polrelid = to_regclass(r.table_name) and p.polname = r.name
  union all
  select 'trigger.' || r.name,
    coalesce(t.tgfoid = to_regprocedure(r.function_name)
      and t.tgenabled in ('O', 'A') and t.tgtype = r.trigger_type, false),
    pg_get_triggerdef(t.oid)
  from required_triggers r
  left join pg_catalog.pg_trigger t on t.tgrelid = to_regclass(r.table_name)
    and t.tgname = r.name and not t.tgisinternal
  union all
  select 'constraint.' || r.name, coalesce(c.convalidated, false), pg_get_constraintdef(c.oid)
  from required_constraints r
  left join pg_catalog.pg_constraint c on c.conrelid = to_regclass('public.' || r.table_name)
    and c.conname = r.name
  union all
  select 'private_column.' || column_name,
    coalesce(roles.authenticated is not null and a.attnum is not null
      and not has_column_privilege(roles.authenticated, a.attrelid, a.attnum, 'SELECT'), false),
    'authenticated must not read this column directly'
  from (values ('moderator_note'), ('submitter_id')) private_columns(column_name)
  cross join roles
  left join pg_catalog.pg_attribute a on a.attrelid = to_regclass('public.questions')
    and a.attname = column_name and a.attnum > 0 and not a.attisdropped
  union all
  select 'auth.objects',
    to_regclass('auth.users') is not null
      and to_regprocedure('auth.uid()') is not null
      and roles.authenticated is not null and roles.anon is not null,
    'Hosted sign-in settings require a separate operator check'
  from roles
  union all
  select 'realtime.functions', to_regprocedure('realtime.topic()') is not null
    and exists (
      select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'realtime' and p.proname = 'broadcast_changes' and p.pronargs = 7
        and p.proargtypes[0] = 'text'::regtype and p.proargtypes[1] = 'text'::regtype
        and p.proargtypes[2] = 'text'::regtype and p.proargtypes[3] = 'text'::regtype
        and p.proargtypes[4] = 'text'::regtype
        and p.proargtypes[5] in ('record'::regtype, 'anyelement'::regtype)
        and p.proargtypes[6] = p.proargtypes[5]
    ), 'Hosted Broadcast delivery requires a separate two-moderator check'
)
select check_id, ok, details from checks order by check_id;

-- Event configuration
-- Run this query only after the schema query passes and definitions match.
-- Replace dev-event with the deployment slug from event.config.ts.
-- Compare session order, IDs, titles, descriptions, and times with the event plan.
with configured(slug) as (values ('dev-event'))
select configured.slug as configured_slug, e.id is not null as event_exists,
  e.id as event_id, e.name, e.is_active, e.starts_at, e.ends_at,
  s.position as session_order, s.value->>'id' as session_id,
  s.value->>'title' as session_title, s.value->>'description' as session_description,
  s.value->>'starts_at' as session_starts_at, s.value->>'ends_at' as session_ends_at
from configured
left join public.events e on e.slug = configured.slug
left join lateral jsonb_array_elements(e.sessions) with ordinality s(value, position) on true
order by s.position;

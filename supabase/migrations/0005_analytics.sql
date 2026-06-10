-- ============================================================
-- סטטיסטיקת שימוש (Analytics) – אירועים, RLS, RPC לאגרגציה (סעיף סטטיסטיקה)
-- ============================================================

-- ---------- טבלת אירועים ----------
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  event_type text not null,
  properties jsonb not null default '{}'::jsonb,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_type_time_idx on analytics_events(event_type, created_at);
create index if not exists analytics_events_time_idx on analytics_events(created_at);
create index if not exists analytics_events_user_idx on analytics_events(user_id);

-- ---------- RLS ----------
alter table analytics_events enable row level security;

-- כתיבה: משתמש מאומת רושם רק אירועים בשמו (מונע זיוף זהות).
create policy analytics_insert on analytics_events for insert
  with check (user_id = auth.uid());

-- קריאה: מנהלים בלבד. מחיקה מתבצעת דרך service role (server action).
create policy analytics_select_admin on analytics_events for select
  using (is_admin());

-- ---------- RPC: ספירת אירועים לפי סוג ----------
create or replace function analytics_event_counts(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now()
)
returns table (event_type text, count bigint, distinct_users bigint)
language sql stable security definer set search_path = public as $$
  select event_type, count(*)::bigint, count(distinct user_id)::bigint
  from analytics_events
  where is_admin() and created_at >= p_from and created_at < p_to
  group by event_type
  order by count(*) desc;
$$;

-- ---------- RPC: חיפושים מובילים ----------
create or replace function analytics_top_searches(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit int default 20
)
returns table (query text, searches bigint, avg_results numeric)
language sql stable security definer set search_path = public as $$
  select lower(trim(properties->>'query')) as query,
         count(*)::bigint as searches,
         round(avg(nullif(properties->>'results_count','')::numeric), 1) as avg_results
  from analytics_events
  where is_admin() and event_type = 'search'
    and created_at >= p_from and created_at < p_to
    and coalesce(trim(properties->>'query'), '') <> ''
  group by lower(trim(properties->>'query'))
  order by searches desc
  limit p_limit;
$$;

-- ---------- RPC: חיפושים ללא תוצאות ----------
create or replace function analytics_zero_searches(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit int default 20
)
returns table (query text, searches bigint)
language sql stable security definer set search_path = public as $$
  select lower(trim(properties->>'query')) as query, count(*)::bigint as searches
  from analytics_events
  where is_admin() and event_type = 'search'
    and created_at >= p_from and created_at < p_to
    and coalesce(nullif(properties->>'results_count','')::int, 0) = 0
    and coalesce(trim(properties->>'query'), '') <> ''
  group by lower(trim(properties->>'query'))
  order by searches desc
  limit p_limit;
$$;

-- ---------- RPC: מוצרים נצפים מובילים (מתוך בחירת מוצר) ----------
create or replace function analytics_top_materials(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit int default 20
)
returns table (material_key text, display_name text, views bigint)
language sql stable security definer set search_path = public as $$
  select properties->>'material_key' as material_key,
         max(properties->>'display_name') as display_name,
         count(*)::bigint as views
  from analytics_events
  where is_admin() and event_type = 'select_material'
    and created_at >= p_from and created_at < p_to
    and coalesce(properties->>'material_key', '') <> ''
  group by properties->>'material_key'
  order by views desc
  limit p_limit;
$$;

-- ---------- RPC: משתמשים פעילים ----------
create or replace function analytics_active_users(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now()
)
returns table (user_id uuid, full_name text, org_name text, event_count bigint, last_event timestamptz)
language sql stable security definer set search_path = public as $$
  select ae.user_id, p.full_name, o.name as org_name,
         count(*)::bigint as event_count, max(ae.created_at) as last_event
  from analytics_events ae
  left join profiles p on p.id = ae.user_id
  left join organizations o on o.id = ae.organization_id
  where is_admin() and ae.created_at >= p_from and ae.created_at < p_to
  group by ae.user_id, p.full_name, o.name
  order by event_count desc;
$$;

-- ---------- RPC: גודל הטבלה (להתרעת סף) ----------
create or replace function analytics_table_stats()
returns table (row_count bigint, total_bytes bigint)
language sql stable security definer set search_path = public as $$
  select (select count(*) from analytics_events)::bigint as row_count,
         pg_total_relation_size('analytics_events')::bigint as total_bytes
  where is_admin();
$$;

grant execute on function analytics_event_counts(timestamptz, timestamptz) to authenticated;
grant execute on function analytics_top_searches(timestamptz, timestamptz, int) to authenticated;
grant execute on function analytics_zero_searches(timestamptz, timestamptz, int) to authenticated;
grant execute on function analytics_top_materials(timestamptz, timestamptz, int) to authenticated;
grant execute on function analytics_active_users(timestamptz, timestamptz) to authenticated;
grant execute on function analytics_table_stats() to authenticated;

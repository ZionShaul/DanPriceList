-- ============================================================
-- משקי דן – מחירון הדברה ודשן : סכמה, RLS ו-RPC
-- ============================================================

-- ---------- טבלאות ----------

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  excel_client_name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);
create unique index if not exists organizations_excel_client_key
  on organizations (lower(excel_client_name));

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null default '',
  email text not null,
  organization_id uuid references organizations(id) on delete set null,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now()
);
create index if not exists profiles_org_idx on profiles(organization_id);

create table if not exists materials_catalog (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists materials_canonical_key
  on materials_catalog (lower(canonical_name));

create table if not exists material_aliases (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials_catalog(id) on delete cascade,
  alias_name text not null,
  sku text
);
create index if not exists material_aliases_material_idx on material_aliases(material_id);
create index if not exists material_aliases_alias_idx on material_aliases(lower(alias_name));
create index if not exists material_aliases_sku_idx on material_aliases(sku);

create table if not exists monthly_uploads (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text,
  status text not null default 'draft' check (status in ('draft','published','historical')),
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  published_at timestamptz,
  total_rows int not null default 0,
  valid_rows int not null default 0,
  rejected_rows int not null default 0,
  organizations_count int not null default 0,
  materials_count int not null default 0,
  unmapped_count int not null default 0
);
-- לכל היותר טעינה אחת מפורסמת בכל רגע
create unique index if not exists monthly_uploads_one_published
  on monthly_uploads (status) where status = 'published';

create table if not exists purchase_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references monthly_uploads(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  supplier text,
  sku text,
  product_description text not null,
  material_id uuid references materials_catalog(id) on delete set null,
  quantity numeric not null,
  unit_price numeric not null,
  total_price numeric not null,
  purchase_date date,
  invoice_number text
);
create index if not exists purchase_rows_upload_idx on purchase_rows(upload_id);
create index if not exists purchase_rows_org_idx on purchase_rows(organization_id);
create index if not exists purchase_rows_material_idx on purchase_rows(material_id);
create index if not exists purchase_rows_desc_idx on purchase_rows(lower(product_description));

create table if not exists rejected_rows (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references monthly_uploads(id) on delete cascade,
  reason text not null,
  raw_data jsonb not null default '{}'::jsonb
);
create index if not exists rejected_rows_upload_idx on rejected_rows(upload_id);

create table if not exists system_settings (
  id int primary key default 1 check (id = 1),
  clicksense_url text,
  clicksense_enabled boolean not null default false
);
insert into system_settings (id) values (1) on conflict do nothing;

-- ---------- פונקציות עזר ----------

create or replace function active_upload_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from monthly_uploads where status = 'published' limit 1;
$$;

create or replace function current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- ---------- RLS ----------

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table materials_catalog enable row level security;
alter table material_aliases enable row level security;
alter table monthly_uploads enable row level security;
alter table purchase_rows enable row level security;
alter table rejected_rows enable row level security;
alter table system_settings enable row level security;

-- profiles: המשתמש רואה את עצמו; מנהל רואה הכל. כתיבה דרך service role.
create policy profiles_select_self on profiles for select
  using (id = auth.uid() or is_admin());

-- organizations: כל משתמש מאומת רשאי לקרוא (להצגת שם הארגון). כתיבה – service role.
create policy organizations_select on organizations for select
  using (auth.uid() is not null);

-- קטלוג חומרים ו-aliases: קריאה לכל מאומת (חיפוש/הצגה). כתיבה – service role.
create policy materials_select on materials_catalog for select
  using (auth.uid() is not null);
create policy aliases_select on material_aliases for select
  using (auth.uid() is not null);

-- monthly_uploads / rejected_rows: מנהל בלבד (משתמש רגיל לא רואה היסטוריה/חריגות).
create policy uploads_admin on monthly_uploads for select using (is_admin());
create policy rejected_admin on rejected_rows for select using (is_admin());

-- purchase_rows: לב הבידוד – משתמש רואה רק את רכישות הארגון שלו מהטעינה הפעילה.
create policy purchase_rows_select on purchase_rows for select using (
  is_admin()
  or (organization_id = current_org_id() and upload_id = active_upload_id())
);

-- system_settings: קריאה לכל מאומת (קישור קליקסנס). כתיבה – service role.
create policy settings_select on system_settings for select
  using (auth.uid() is not null);

-- ---------- RPC: מחירים מצרפיים (אגרגציה בלבד, ללא חשיפת שורות) ----------
-- security definer => עוקף RLS ומחזיר אגרגציה על פני כל הארגונים מבלי לחשוף שורות פרטניות.

create or replace function get_material_prices(
  p_key text default null,
  p_search text default null
)
returns table (
  material_key text,
  material_id uuid,
  display_name text,
  sku text,
  is_mapped boolean,
  low_price numeric,
  high_price numeric,
  weighted_avg numeric,
  purchase_count bigint,
  total_quantity numeric
)
language sql stable security definer set search_path = public as $$
  with agg as (
    select
      coalesce(pr.material_id::text, 'desc:' || pr.product_description) as material_key,
      pr.material_id,
      coalesce(mc.canonical_name, pr.product_description) as display_name,
      max(pr.sku) as sku,
      (pr.material_id is not null) as is_mapped,
      min(pr.unit_price) as low_price,
      max(pr.unit_price) as high_price,
      sum(pr.total_price) / nullif(sum(pr.quantity), 0) as weighted_avg,
      count(*) as purchase_count,
      sum(pr.quantity) as total_quantity
    from purchase_rows pr
    left join materials_catalog mc on mc.id = pr.material_id
    where pr.upload_id = active_upload_id()
    group by
      coalesce(pr.material_id::text, 'desc:' || pr.product_description),
      pr.material_id,
      coalesce(mc.canonical_name, pr.product_description),
      (pr.material_id is not null)
  )
  select * from agg
  where (p_key is null or material_key = p_key)
    and (p_search is null or display_name ilike '%' || p_search || '%')
  order by display_name;
$$;

-- ---------- RPC: הצעות חיפוש ----------

create or replace function search_materials(p_query text)
returns table (material_key text, display_name text, is_mapped boolean)
language sql stable security definer set search_path = public as $$
  select distinct
    coalesce(pr.material_id::text, 'desc:' || pr.product_description) as material_key,
    coalesce(mc.canonical_name, pr.product_description) as display_name,
    (pr.material_id is not null) as is_mapped
  from purchase_rows pr
  left join materials_catalog mc on mc.id = pr.material_id
  where pr.upload_id = active_upload_id()
    and (
      p_query is null or p_query = ''
      or coalesce(mc.canonical_name, pr.product_description) ilike '%' || p_query || '%'
      or pr.sku ilike '%' || p_query || '%'
      or exists (
        select 1 from material_aliases ma
        where ma.material_id = pr.material_id
          and ma.alias_name ilike '%' || p_query || '%'
      )
    )
  order by display_name
  limit 20;
$$;

-- ---------- RPC: חומרים לא ממופים (למנהל) ----------

create or replace function get_unmapped_materials(p_upload_id uuid default null)
returns table (product_description text, sku text, occurrences bigint)
language sql stable security definer set search_path = public as $$
  select pr.product_description, max(pr.sku) as sku, count(*) as occurrences
  from purchase_rows pr
  where pr.material_id is null
    and pr.upload_id = coalesce(p_upload_id, active_upload_id())
    and is_admin()
  group by pr.product_description
  order by occurrences desc, pr.product_description;
$$;

grant execute on function get_material_prices(text, text) to authenticated;
grant execute on function search_materials(text) to authenticated;
grant execute on function get_unmapped_materials(uuid) to authenticated;
grant execute on function active_upload_id() to authenticated;

-- ---------- Storage bucket לקבצי אקסל ----------
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

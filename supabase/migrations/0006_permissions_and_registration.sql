-- ============================================================
-- הרשאות תצוגה ברמת משתמש + קישור בקשת רישום במסך ההתחברות
-- ============================================================

-- ---------- הרשאות תצוגה לכל משתמש (ברירת מחדל: מוצג, לשמירת ההתנהגות הקיימת) ----------
alter table profiles
  add column if not exists show_purchases boolean not null default true;       -- הצגת רכישות במסך החיפוש/חומר
alter table profiles
  add column if not exists show_my_purchases boolean not null default true;     -- הצגת מסך "הרכישות שלי"

-- ---------- קישור "בקשה לרישום משתמש" (מוצג במסך ההתחברות) ----------
alter table system_settings add column if not exists registration_url text;
alter table system_settings add column if not exists registration_enabled boolean not null default false;

-- מסך ההתחברות אינו מאומת, ולכן RLS על system_settings (קריאה למאומתים בלבד) חוסם.
-- פונקציית security definer חושפת אך ורק את קישור הרישום ל-anon.
create or replace function get_registration_link()
returns table (url text, enabled boolean)
language sql stable security definer set search_path = public as $$
  select registration_url, registration_enabled from system_settings where id = 1;
$$;

grant execute on function get_registration_link() to anon, authenticated;

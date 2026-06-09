-- ============================================================
-- שם תצוגה לטעינה (מחירון פעיל) + RPC לחשיפתו למשתמש (סעיף 6)
-- ============================================================

-- שם הטעינה כפי שיוצג למשתמשים (לדוגמה: "מחירון מאי 2026").
alter table monthly_uploads add column if not exists title text;

-- RPC: פרטי הטעינה הפעילה לחשיפה למשתמש רגיל.
-- RLS על monthly_uploads מוגבל למנהל בלבד, ולכן נדרשת פונקציית security definer
-- שמחזירה רק את שם המחירון הפעיל ותאריך הפרסום (ללא שורות/חריגות).
create or replace function get_active_upload()
returns table (id uuid, title text, file_name text, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, title, file_name, published_at
  from monthly_uploads
  where status = 'published'
  limit 1;
$$;

grant execute on function get_active_upload() to authenticated;

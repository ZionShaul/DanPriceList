-- ============================================================
-- פרסום/שחזור טעינה באופן אטומי (סעיף 11.2 / 17)
-- ============================================================
-- נקרא ע"י קליינט המשתמש (מנהל): is_admin() מאמת הרשאה,
-- SECURITY DEFINER עוקף RLS לעדכון הסטטוסים.

create or replace function publish_upload(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  -- הטעינה המפורסמת הנוכחית הופכת להיסטורית
  update monthly_uploads
    set status = 'historical'
    where status = 'published' and id <> p_id;

  -- הטעינה הנבחרת הופכת לפעילה
  update monthly_uploads
    set status = 'published', published_at = now()
    where id = p_id;
end;
$$;

grant execute on function publish_upload(uuid) to authenticated;

-- ============================================================
-- קשירת חשבון למכשיר יחיד (Device Binding) – משתמשים רגילים
-- ============================================================
-- "המכשיר הראשון מנצח": החשבון נקשר למכשיר הראשון שמתחבר;
-- מנהל יכול לאפס את הקשירה. מנהלים פטורים (נאכף בקוד).

alter table profiles add column if not exists active_device_id text;
alter table profiles add column if not exists active_device_label text;
alter table profiles add column if not exists device_bound_at timestamptz;

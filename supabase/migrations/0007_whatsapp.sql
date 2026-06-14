-- ============================================================
-- כפתור תמיכה בוואטסאפ – הגדרות מערכת
-- ============================================================

alter table system_settings add column if not exists whatsapp_number text;
alter table system_settings add column if not exists whatsapp_message text;
alter table system_settings add column if not exists whatsapp_enabled boolean not null default false;

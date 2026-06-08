-- ============================================================
-- נתוני דמו ראשוניים (אופציונלי) – ארגון לדוגמה וקטלוג חומרים בסיסי
-- ============================================================

insert into organizations (name, excel_client_name, status)
values
  ('משק לדוגמה', 'משק לדוגמה', 'active')
on conflict (lower(excel_client_name)) do nothing;

-- חומר תקני לדוגמה עם שמות חלופיים (לפי הדוגמה באפיון, סעיף 8)
with m as (
  insert into materials_catalog (canonical_name, status)
  values ('אוראן 32%', 'active')
  on conflict (lower(canonical_name)) do nothing
  returning id
)
insert into material_aliases (material_id, alias_name, sku)
select m.id, a.alias, null
from m, (values ('אוראן 32'), ('אוראן 32% צובר'), ('UAN 32')) as a(alias)
on conflict do nothing;

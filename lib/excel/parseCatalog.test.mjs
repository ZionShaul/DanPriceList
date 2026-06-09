// בדיקות יחידה לפרסור קטלוג החומרים.
// הרצה: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyCatalog } from "./parseCatalog.ts";

const map = { canonical: "שם תקני", alias: "שם חלופי", sku: 'מק"ט' };

test("classifyCatalog אוסף שמות תקניים ייחודיים ומדלג על שורות ללא שם תקני", () => {
  const records = [
    { "שם תקני": "אוראן 32%", "שם חלופי": "אוראן 32", 'מק"ט': "UAN32" },
    { "שם תקני": "אוראן 32%", "שם חלופי": "UAN 32", 'מק"ט': "UAN32" },
    { "שם תקני": "ראונדאפ 500", "שם חלופי": "", 'מק"ט': "RD500" },
    { "שם תקני": "", "שם חלופי": "כלום", 'מק"ט': "" }, // ידולג
  ];
  const res = classifyCatalog(records, map);
  assert.equal(res.totalRows, 4);
  assert.equal(res.skipped, 1);
  assert.equal(res.canonicals.length, 2);
  assert.equal(res.entries.length, 3);
  assert.equal(res.entries[0].alias, "אוראן 32");
  assert.equal(res.entries[2].alias, null); // שם חלופי ריק => null
  assert.equal(res.entries[2].sku, "RD500");
});

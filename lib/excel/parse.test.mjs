// בדיקות יחידה לחוקי הניקוי, מיפוי הכותרות וחישוב המחיר.
// הרצה: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

// Node 24 טוען קבצי TS ישירות (type stripping מובנה)
import { buildHeaderMap, classifyRows, parseNumber } from "./parse.ts";
import { computePriceMetrics } from "../pricing.ts";

test("parseNumber מטפל בפסיקים ומטבע", () => {
  assert.equal(parseNumber("1,234.5"), 1234.5);
  assert.equal(parseNumber("₪ 12.0"), 12);
  assert.equal(parseNumber(7), 7);
  assert.ok(Number.isNaN(parseNumber("")));
});

test("buildHeaderMap ממפה כותרות עבריות עם גרשיים", () => {
  const map = buildHeaderMap(["לקוח", "ספק", 'מק"ט', "תיאור מוצר", "כמות", "מחיר ליחידה", 'סה"כ מחיר', "תאריך", "מספר חשבונית/תעודה"]);
  assert.equal(map.client, "לקוח");
  assert.equal(map.sku, 'מק"ט');
  assert.equal(map.description, "תיאור מוצר");
  assert.equal(map.unitPrice, "מחיר ליחידה");
  assert.equal(map.totalPrice, 'סה"כ מחיר');
  assert.equal(map.invoice, "מספר חשבונית/תעודה");
});

const HEADERS = ["לקוח", "ספק", "תיאור מוצר", "כמות", "מחיר ליחידה", 'סה"כ מחיר'];
const map = buildHeaderMap(HEADERS);

function row(client, desc, qty, price, total) {
  return { "לקוח": client, "ספק": "ספק א", "תיאור מוצר": desc, "כמות": qty, "מחיר ליחידה": price, 'סה"כ מחיר': total };
}

test("חוקי חריגות – סעיף 7", () => {
  const records = [
    row("משק א", "אוראן 32", 10, 5, 50), // תקין
    row("", "אוראן 32", 10, 5, 50), // ללא לקוח
    row("משק א", "", 10, 5, 50), // ללא תיאור
    row("משק א", "אוראן 32", 0, 5, 0), // כמות 0
    row("משק א", "אוראן 32", 10, 0, 0), // מחיר 0
    row("משק א", "זיכוי על אוראן", 10, 5, 50), // זיכוי לפי מילה
    row("משק א", "אוראן 32", -2, 5, -10), // כמות שלילית => זיכוי
  ];
  const res = classifyRows(records, map);
  assert.equal(res.valid.length, 1);
  assert.equal(res.rejected.length, 6);
  const reasons = res.rejected.map((r) => r.reason);
  assert.ok(reasons.includes("שורה ללא תיאור מוצר או ללא לקוח"));
  assert.ok(reasons.includes("כמות קטנה או שווה ל-0"));
  assert.ok(reasons.includes("מחיר ליחידה קטן או שווה ל-0"));
  assert.ok(reasons.includes("שורת זיכוי / החזר"));
});

test("השלמת מחיר יחידה מסה\"כ וכמות", () => {
  const records = [{ "לקוח": "משק א", "תיאור מוצר": "דשן X", "כמות": 4, "מחיר ליחידה": "", 'סה"כ מחיר': 100 }];
  const res = classifyRows(records, map);
  assert.equal(res.valid.length, 1);
  assert.equal(res.valid[0].unitPrice, 25);
});

test("ממוצע משוקלל לפי כמות – סעיף 9", () => {
  // 10 יח' ב-5 (=50) + 30 יח' ב-9 (=270) => 320/40 = 8
  const m = computePriceMetrics([
    { quantity: 10, unitPrice: 5, totalPrice: 50 },
    { quantity: 30, unitPrice: 9, totalPrice: 270 },
  ]);
  assert.equal(m.low, 5);
  assert.equal(m.high, 9);
  assert.equal(m.weightedAvg, 8);
  assert.equal(m.count, 2);
  assert.equal(m.totalQuantity, 40);
});

test("פרסור תאריך בפורמט ישראלי יום-תחילה", () => {
  const headers = ["לקוח", "תיאור מוצר", "כמות", "מחיר ליחידה", "תאריך"];
  const hmap = buildHeaderMap(headers);
  const recs = [
    { "לקוח": "משק", "תיאור מוצר": "א", "כמות": 1, "מחיר ליחידה": 10, "תאריך": "31.05.26" },
    { "לקוח": "משק", "תיאור מוצר": "ב", "כמות": 1, "מחיר ליחידה": 10, "תאריך": "17/05/2026" },
    { "לקוח": "משק", "תיאור מוצר": "ג", "כמות": 1, "מחיר ליחידה": 10, "תאריך": "טקסט לא תקין" },
  ];
  const res = classifyRows(recs, hmap);
  assert.equal(res.valid.length, 3);
  assert.equal(res.valid[0].date, "2026-05-31");
  assert.equal(res.valid[1].date, "2026-05-17");
  assert.equal(res.valid[2].date, null); // לא נשמר טקסט שבור (לא שובר את ה-DB)
});

test("זיהוי פורמט מצרפי לפי משק (שם משק / מחיר / סכום)", () => {
  const headers = ["תאור פריט", "כמות", "מחיר", "סכום", "מספר משקים רכשו", "ספק", "שם גנרי", "שם משק", "מחלקה"];
  const hmap = buildHeaderMap(headers);
  assert.equal(hmap.client, "שם משק");
  assert.equal(hmap.description, "תאור פריט");
  assert.equal(hmap.supplier, "ספק");
  assert.equal(hmap.unitPrice, "מחיר");
  assert.equal(hmap.totalPrice, "סכום"); // ולא "מחיר" – הבאג שתוקן
  assert.equal(hmap.date, undefined); // אין תאריך בפורמט זה
  assert.equal(hmap.sku, undefined); // אין מק"ט

  // ערכים: סה"כ נלקח מ"סכום" ולא ממחיר היחידה
  const recs = [{ "שם משק": "משק א", "תאור פריט": "דשן", "כמות": 2, "מחיר": 100, "סכום": 200 }];
  const res = classifyRows(recs, hmap);
  assert.equal(res.valid.length, 1);
  assert.equal(res.valid[0].unitPrice, 100);
  assert.equal(res.valid[0].totalPrice, 200);
  assert.equal(res.valid[0].client, "משק א");
});

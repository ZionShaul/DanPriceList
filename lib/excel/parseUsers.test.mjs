// בדיקות יחידה לפרסור קובץ המשתמשים.
// הרצה: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyUsers } from "./parseUsers.ts";

const map = {
  full_name: "שם מלא",
  email: "אימייל",
  phone: "טלפון",
  organization: "ארגון",
  role: "תפקיד",
};

function rec(full_name, email, org, role) {
  return { "שם מלא": full_name, "אימייל": email, "טלפון": "050", "ארגון": org, "תפקיד": role };
}

test("classifyUsers מסווג שורות תקינות ופסולות", () => {
  const records = [
    rec("ישראל", "a@b.com", "משק הירדן", "משתמש רגיל"), // תקין
    rec("מנהל", "admin@b.com", "", "מנהל"), // מנהל ללא ארגון – תקין
    rec("", "x@b.com", "משק", "רגיל"), // חסר שם
    rec("שם", "not-an-email", "משק", "רגיל"), // אימייל לא תקין
    rec("שם", "a@b.com", "משק", "רגיל"), // אימייל כפול
    rec("רגיל", "noorg@b.com", "", "רגיל"), // רגיל ללא ארגון
  ];
  const res = classifyUsers(records, map);
  assert.equal(res.totalRows, 6);
  assert.equal(res.entries.length, 2);
  assert.equal(res.entries[0].role, "user");
  assert.equal(res.entries[1].role, "admin");
  assert.equal(res.invalid.length, 4);
  const reasons = res.invalid.map((r) => r.reason);
  assert.ok(reasons.includes("חסר שם מלא או אימייל"));
  assert.ok(reasons.includes("אימייל לא תקין"));
  assert.ok(reasons.includes("אימייל כפול בקובץ"));
  assert.ok(reasons.includes("משתמש רגיל ללא ארגון"));
});

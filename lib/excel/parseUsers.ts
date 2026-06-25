import * as XLSX from "xlsx";

// ===== פרסור קובץ משתמשים לטעינה מרוכזת (סעיף 5) =====

/** ניקוי כותרת לצורך השוואה: הסרת גרשיים/רווחים כפולים (זהה ל-parse.ts). */
function normalizeHeader(s: string): string {
  return String(s ?? "")
    .replace(/["'׳״‘’“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface UserEntry {
  full_name: string;
  email: string;
  phone: string;
  organization: string | null; // שם הארגון (יותאם/ייווצר לפי שם)
  role: "user" | "admin";
  show_purchases: boolean; // הצגת רכישות במסך החיפוש/חומר
  show_my_purchases: boolean; // הצגת מסך "הרכישות שלי"
}

export interface UserParseResult {
  entries: UserEntry[];
  invalid: { reason: string; raw: Record<string, unknown> }[];
  totalRows: number;
}

type Field =
  | "full_name"
  | "email"
  | "phone"
  | "organization"
  | "role"
  | "show_purchases"
  | "show_my_purchases";

const HEADER_SYNONYMS: Record<Field, string[]> = {
  full_name: ["שם מלא", "שם", "שם משתמש", "full name", "name"],
  email: ["אימייל", "מייל", "דוא״ל", 'דוא"ל', "email", "e-mail"],
  phone: ["טלפון", "נייד", "מספר טלפון", "phone"],
  organization: ["ארגון", "לקוח", "שם לקוח", "משק", "organization"],
  role: ["תפקיד", "סוג משתמש", "role"],
  show_purchases: ["הצגת רכישות בחיפוש", "רכישות בחיפוש", "הצגת רכישות", "show purchases"],
  show_my_purchases: ["הצגת הרכישות שלי", "הרכישות שלי", "מסך הרכישות שלי", "show my purchases"],
};

function buildHeaderMap(headers: string[]): Partial<Record<Field, string>> {
  const norm = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  const map: Partial<Record<Field, string>> = {};
  (Object.keys(HEADER_SYNONYMS) as Field[]).forEach((field) => {
    for (const syn of HEADER_SYNONYMS[field]) {
      const ns = normalizeHeader(syn);
      const hit =
        norm.find((h) => h.n === ns) ?? norm.find((h) => h.n.includes(ns) || ns.includes(h.n));
      if (hit) {
        map[field] = hit.raw;
        break;
      }
    }
  });
  return map;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

/** בוליאני מתא אקסל: ריק → ברירת מחדל (true); "לא"/no/false/0 → false; אחרת true. */
function toBool(value: unknown): boolean {
  const s = toText(value);
  if (s === null) return true;
  return !/^(לא|no|false|0|n|✗|x)$/i.test(s);
}

const ADMIN_KEYWORDS = ["admin", "מנהל"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** סיווג רשומות המשתמשים (ניתן לבדיקה ללא קובץ אמיתי). */
export function classifyUsers(
  records: Record<string, unknown>[],
  headerMap: Partial<Record<Field, string>>,
): UserParseResult {
  const entries: UserEntry[] = [];
  const invalid: { reason: string; raw: Record<string, unknown> }[] = [];
  const seenEmails = new Set<string>();

  const get = (rec: Record<string, unknown>, field: Field): unknown => {
    const key = headerMap[field];
    return key ? rec[key] : undefined;
  };

  for (const rec of records) {
    const full_name = toText(get(rec, "full_name"));
    const email = toText(get(rec, "email"))?.toLowerCase() ?? null;
    const phone = toText(get(rec, "phone")) ?? "";
    const organization = toText(get(rec, "organization"));
    const roleText = toText(get(rec, "role"))?.toLowerCase() ?? "";
    const role: "user" | "admin" = ADMIN_KEYWORDS.some((k) => roleText.includes(k))
      ? "admin"
      : "user";

    if (!full_name || !email) {
      invalid.push({ reason: "חסר שם מלא או אימייל", raw: rec });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      invalid.push({ reason: "אימייל לא תקין", raw: rec });
      continue;
    }
    if (seenEmails.has(email)) {
      invalid.push({ reason: "אימייל כפול בקובץ", raw: rec });
      continue;
    }
    if (role === "user" && !organization) {
      invalid.push({ reason: "משתמש רגיל ללא ארגון", raw: rec });
      continue;
    }
    seenEmails.add(email);
    entries.push({
      full_name,
      email,
      phone,
      organization,
      role,
      show_purchases: toBool(get(rec, "show_purchases")),
      show_my_purchases: toBool(get(rec, "show_my_purchases")),
    });
  }

  return { entries, invalid, totalRows: records.length };
}

/** פרסור מלא של קובץ משתמשים (Buffer/ArrayBuffer) — צד שרת. */
export function parseUsersExcel(data: ArrayBuffer | Uint8Array): UserParseResult {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { entries: [], invalid: [], totalRows: 0 };
  const sheet = wb.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const headerMap = buildHeaderMap(headers);
  return classifyUsers(records, headerMap);
}

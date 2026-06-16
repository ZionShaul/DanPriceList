import * as XLSX from "xlsx";

// ===== פרסור קובץ האקסל החודשי + חוקי ניקוי/חריגות (סעיף 7) =====

export interface RawPurchase {
  client: string;
  supplier: string | null;
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string | null;
  invoice: string | null;
}

export interface RejectedParse {
  reason: string;
  raw: Record<string, unknown>;
}

export interface ParseResult {
  valid: RawPurchase[];
  rejected: RejectedParse[];
  totalRows: number;
  clients: string[];
  descriptions: string[];
}

type Field =
  | "client"
  | "supplier"
  | "sku"
  | "description"
  | "quantity"
  | "unitPrice"
  | "totalPrice"
  | "date"
  | "invoice";

// מילים נרדפות לכותרות עמודות (סעיף 6.1)
const HEADER_SYNONYMS: Record<Field, string[]> = {
  client: ["לקוח", "שם לקוח", "ארגון"],
  supplier: ["ספק", "שם ספק"],
  sku: ["מקט", "מק״ט", 'מק"ט', "קוד פריט", "קוד"],
  description: ["תיאור מוצר", "תיאור", "שם חומר", "פריט", "מוצר", "שם פריט"],
  quantity: ["כמות", "כמות נטו"],
  unitPrice: ["מחיר ליחידה", "מחיר יחידה", "מחיר", "מחיר יח"],
  totalPrice: ["סהכ מחיר", "סה״כ מחיר", 'סה"כ מחיר', "סהכ", "סה״כ", "סכום", "סך הכל", "total"],
  date: ["תאריך", "תאריך חשבונית", "תאריך תעודה"],
  invoice: ["מספר חשבונית", "חשבונית", "מספר תעודה", "תעודה", "אסמכתא", "מספר חשבונית/תעודה"],
};

const CREDIT_KEYWORDS = ["זיכוי", "החזר", "ביטול"];

/** ניקוי כותרת לצורך השוואה: הסרת גרשיים/רווחים כפולים. */
export function normalizeHeader(s: string): string {
  return String(s ?? "")
    .replace(/["'׳״‘’“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** ממפה כל שדה במערכת לכותרת בפועל בקובץ. */
export function buildHeaderMap(headers: string[]): Partial<Record<Field, string>> {
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

/** המרת ערך תא למספר (תומך במחרוזות עם פסיקים/מטבע). */
export function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return NaN;
  if (typeof value === "number") return value;
  const cleaned = String(value)
    .replace(/[^\d.,\-]/g, "")
    .replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isNaN(n) ? NaN : n;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function toDateString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  // מספר סריאלי של אקסל (גיבוי – בד"כ cellDates ממיר ל-Date)
  if (typeof value === "number" && value > 0 && value < 60000) {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const s = String(value).trim();

  // פורמט ישראלי יום-תחילה: DD.MM.YY(YY) / DD/MM/YYYY / DD-MM-YY
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      const iso = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return iso;
    }
  }

  // ISO או פורמט שה-Date מזהה
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  // לא ניתן לפרסר – מחזירים null (כדי לא לשבור את הטעינה ב-DB)
  return null;
}

/**
 * סיווג שורות לתקינות/חריגות לפי חוקי סעיף 7.
 * מקבל רשומות (אובייקטים לפי כותרות) – ניתן לבדיקה ללא קובץ אמיתי.
 */
export function classifyRows(
  records: Record<string, unknown>[],
  headerMap: Partial<Record<Field, string>>,
): ParseResult {
  const valid: RawPurchase[] = [];
  const rejected: RejectedParse[] = [];
  const clients = new Set<string>();
  const descriptions = new Set<string>();

  const get = (rec: Record<string, unknown>, field: Field): unknown => {
    const key = headerMap[field];
    return key ? rec[key] : undefined;
  };

  for (const rec of records) {
    const client = toText(get(rec, "client"));
    const description = toText(get(rec, "description"));
    const supplier = toText(get(rec, "supplier"));
    const sku = toText(get(rec, "sku"));
    const invoice = toText(get(rec, "invoice"));
    const date = toDateString(get(rec, "date"));

    const quantity = parseNumber(get(rec, "quantity"));
    let unitPrice = parseNumber(get(rec, "unitPrice"));
    let totalPrice = parseNumber(get(rec, "totalPrice"));

    // שורת זיכוי / החזר (סעיף 7)
    const textBlob = `${description ?? ""} ${invoice ?? ""}`;
    const isCredit =
      CREDIT_KEYWORDS.some((k) => textBlob.includes(k)) ||
      quantity < 0 ||
      totalPrice < 0 ||
      unitPrice < 0;

    // שורה ללא תיאור מוצר או ללא לקוח (סעיף 7)
    if (!description || !client) {
      rejected.push({ reason: "שורה ללא תיאור מוצר או ללא לקוח", raw: rec });
      continue;
    }
    if (isCredit) {
      rejected.push({ reason: "שורת זיכוי / החזר", raw: rec });
      continue;
    }

    // השלמת מחיר/סה\"כ חסרים מתוך השדות האחרים
    if (Number.isNaN(unitPrice) && !Number.isNaN(totalPrice) && quantity > 0) {
      unitPrice = totalPrice / quantity;
    }
    if (Number.isNaN(totalPrice) && !Number.isNaN(unitPrice) && !Number.isNaN(quantity)) {
      totalPrice = unitPrice * quantity;
    }

    // כמות קטנה/שווה ל-0 (סעיף 7)
    if (Number.isNaN(quantity) || quantity <= 0) {
      rejected.push({ reason: "כמות קטנה או שווה ל-0", raw: rec });
      continue;
    }
    // מחיר ליחידה קטן/שווה ל-0 (סעיף 7)
    if (Number.isNaN(unitPrice) || unitPrice <= 0) {
      rejected.push({ reason: "מחיר ליחידה קטן או שווה ל-0", raw: rec });
      continue;
    }
    // לא ניתן לחשב מחיר תקין (סעיף 7)
    if (Number.isNaN(totalPrice) || totalPrice <= 0) {
      rejected.push({ reason: "שורה שלא ניתן לחשב ממנה מחיר תקין", raw: rec });
      continue;
    }

    clients.add(client);
    descriptions.add(description);
    valid.push({
      client,
      supplier,
      sku,
      description,
      quantity,
      unitPrice,
      totalPrice,
      date,
      invoice,
    });
  }

  return {
    valid,
    rejected,
    totalRows: records.length,
    clients: [...clients],
    descriptions: [...descriptions],
  };
}

/** פרסור מלא של קובץ אקסל (Buffer/ArrayBuffer) – משמש בצד השרת. */
export function parseExcel(data: ArrayBuffer | Uint8Array): ParseResult {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { valid: [], rejected: [], totalRows: 0, clients: [], descriptions: [] };
  }
  const sheet = wb.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const headerMap = buildHeaderMap(headers);
  return classifyRows(records, headerMap);
}

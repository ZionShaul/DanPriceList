import * as XLSX from "xlsx";

// ===== פרסור קובץ קטלוג חומרים (שם תקני + שמות חלופיים + מק"ט) — סעיף 3/8 =====

/** ניקוי כותרת לצורך השוואה: הסרת גרשיים/רווחים כפולים (זהה ל-parse.ts). */
function normalizeHeader(s: string): string {
  return String(s ?? "")
    .replace(/["'׳״‘’“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface CatalogEntry {
  canonical: string;
  alias: string | null;
  sku: string | null;
}

export interface CatalogParseResult {
  entries: CatalogEntry[];
  canonicals: string[]; // שמות תקניים ייחודיים
  totalRows: number;
  skipped: number; // שורות ללא שם תקני
}

type Field = "canonical" | "alias" | "sku";

const HEADER_SYNONYMS: Record<Field, string[]> = {
  canonical: ["שם תקני", "חומר תקני", "שם חומר", "שם", "חומר", "canonical"],
  alias: ["שם חלופי", "שם באקסל", "שם נרדף", "כינוי", "alias"],
  sku: ["מקט", "מק״ט", 'מק"ט', "קוד פריט", "קוד", "sku"],
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

/** סיווג רשומות הקטלוג (ניתן לבדיקה ללא קובץ אמיתי). */
export function classifyCatalog(
  records: Record<string, unknown>[],
  headerMap: Partial<Record<Field, string>>,
): CatalogParseResult {
  const entries: CatalogEntry[] = [];
  const canonicals = new Set<string>();
  let skipped = 0;

  const get = (rec: Record<string, unknown>, field: Field): unknown => {
    const key = headerMap[field];
    return key ? rec[key] : undefined;
  };

  for (const rec of records) {
    const canonical = toText(get(rec, "canonical"));
    if (!canonical) {
      skipped++;
      continue;
    }
    const alias = toText(get(rec, "alias"));
    const sku = toText(get(rec, "sku"));
    canonicals.add(canonical);
    entries.push({ canonical, alias, sku });
  }

  return { entries, canonicals: [...canonicals], totalRows: records.length, skipped };
}

/** פרסור מלא של קובץ קטלוג (Buffer/ArrayBuffer) — צד שרת. */
export function parseCatalogExcel(data: ArrayBuffer | Uint8Array): CatalogParseResult {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { entries: [], canonicals: [], totalRows: 0, skipped: 0 };
  const sheet = wb.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const headerMap = buildHeaderMap(headers);
  return classifyCatalog(records, headerMap);
}

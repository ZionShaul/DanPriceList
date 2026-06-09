// יוצר תבניות אקסל להורדה: קטלוג חומרים וטעינת משתמשים.
// הרצה: node scripts/make-templates.mjs
import * as XLSX from "xlsx";
import * as fs from "node:fs";
XLSX.set_fs(fs);

fs.mkdirSync("public/templates", { recursive: true });

// ----- תבנית קטלוג חומרים -----
const catalogRows = [
  { "שם תקני": "אוראן 32%", "שם חלופי": "אוראן 32", "מק״ט": "UAN32" },
  { "שם תקני": "אוראן 32%", "שם חלופי": "UAN 32", "מק״ט": "UAN32" },
  { "שם תקני": "ראונדאפ 500", "שם חלופי": "", "מק״ט": "RD500" },
];
const catalogWs = XLSX.utils.json_to_sheet(catalogRows);
const catalogWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(catalogWb, catalogWs, "קטלוג");
XLSX.writeFile(catalogWb, "public/templates/catalog-template.xlsx");

// ----- תבנית משתמשים -----
const userRows = [
  {
    "שם מלא": "ישראל ישראלי",
    "אימייל": "user@example.com",
    "טלפון": "050-0000000",
    "ארגון": "משק הירדן",
    "תפקיד": "משתמש רגיל",
  },
  {
    "שם מלא": "מנהל לדוגמה",
    "אימייל": "admin@example.com",
    "טלפון": "050-1111111",
    "ארגון": "",
    "תפקיד": "מנהל",
  },
];
const usersWs = XLSX.utils.json_to_sheet(userRows);
const usersWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(usersWb, usersWs, "משתמשים");
XLSX.writeFile(usersWb, "public/templates/users-template.xlsx");

console.log("נכתבו public/templates/catalog-template.xlsx ו-users-template.xlsx");

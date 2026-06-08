// יצירת משתמש מנהל ראשון (אין הרשמה עצמית – סעיף 4).
// שימוש:  node scripts/create-admin.mjs admin@example.com "שם מלא"
// דורש .env.local עם NEXT_PUBLIC_SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* אפשר גם להגדיר משתני סביבה ידנית */
  }
}

loadEnv();

const [, , email, fullName] = process.argv;
if (!email) {
  console.error('שימוש: node scripts/create-admin.mjs <email> "<שם מלא>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("חסרים NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ב-.env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
});
if (createErr) {
  console.error("שגיאה ביצירת המשתמש:", createErr.message);
  process.exit(1);
}

const userId = created.user.id;
const { error: profErr } = await supabase.from("profiles").insert({
  id: userId,
  full_name: fullName || email,
  email,
  role: "admin",
  status: "active",
});
if (profErr) {
  console.error("שגיאה ביצירת הפרופיל:", profErr.message);
  process.exit(1);
}

console.log(`✓ נוצר מנהל: ${email} (id=${userId})`);
console.log("התחבר/י דרך מסך ההתחברות עם קוד OTP לאימייל הזה.");

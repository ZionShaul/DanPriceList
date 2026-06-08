# מחירון משקי דן — הדברה ודשן

מערכת **Web/PWA** בעברית (RTL), מותאמת מובייל, להצגת מחירי חומרי הדברה ודשן מתוך קובץ אקסל חודשי, עם פירוט רכישות אישי לפי ארגון ומסכי ניהול לדסקטופ ומובייל.

## יכולות עיקריות
- 🔍 חיפוש חומר והצגת **מחיר נמוך / ממוצע משוקלל / גבוה** + מספר רכישות וסך כמות.
- 🧾 מסך **"הרכישות שלי"** — פירוט רכישות הארגון בלבד (בידוד ב‑RLS).
- 🔐 התחברות **OTP במייל**, חיבור נשמר במכשיר. אין הרשמה עצמית.
- 📄 **טעינת אקסל** ע"י מנהל → סיכום ובדיקת חריגות → **פרסום**. רק הקובץ המפורסם פעיל.
- 🧪 **קטלוג חומר תקני** + טיפול בחומרים לא ממופים.
- 🕘 **היסטוריית טעינות**, שחזור ומחיקה (לא ניתן למחוק את הפעילה).
- ↗️ כפתור **קליקסנס** לפירוט מלא (נפתח בלשונית חדשה).
- 📱 **PWA** — הוספה למסך הבית, פתיחה במסך מלא.

## סטאק
Next.js 16 (App Router, TS) · Tailwind v4 · Supabase (Postgres + Auth + Storage + RLS) · SheetJS · Vercel.

## התחלה מהירה
ראו את **[SETUP.md](SETUP.md)** למדריך התקנה, הגדרת Supabase, יצירת מנהל ראשון ופריסה ל‑Vercel.

```bash
npm install
cp .env.local.example .env.local   # מילוי פרטי Supabase
npm run dev                         # http://localhost:3000
npm test                            # בדיקות לוגיקת פרסור וחישוב
```

קובץ אקסל לדוגמה לבדיקת זרימת הטעינה: [`samples/sample-monthly.xlsx`](samples/sample-monthly.xlsx) (5 שורות תקינות + 4 חריגות, 2 ארגונים). ליצירה מחדש: `node scripts/make-sample.mjs`.

## פריסה ל‑Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FZionShaul%2FDanPriceList&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_SITE_URL&envDescription=Supabase%20project%20keys)

לאחר הפריסה יש להריץ את המיגרציות ב‑Supabase וליצור מנהל ראשון — פירוט ב‑[SETUP.md](SETUP.md).

## מבנה
```
app/(app)/        מסכי משתמש: חיפוש, תוצאת חומר, הרכישות שלי
app/admin/        מסכי מנהל: סקירה, טעינה, משתמשים, חומרים, היסטוריה, הגדרות
app/login/        התחברות OTP
lib/excel/        פרסור אקסל + חוקי חריגות (נבדק ב-npm test)
lib/actions/      Server Actions (טעינה, פרסום, משתמשים, חומרים, הגדרות)
lib/supabase/     קליינטים (browser / server / admin)
supabase/migrations/  סכמה, RLS, RPC, seed
```

האפיון המלא: `אפיון_משקי_דן_מחירון_הדברה_ודשן.docx`.

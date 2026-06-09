// מייצר את נכסי הלוגו והאייקונים מתוך קבצי המקור.
// מקור: "לוגו סופי משקי דן.png" (לוגו מלא) + "סמליל בלבד.png" (סמליל).
// הרצה: node scripts/make-icons.mjs
import sharp from "sharp";
import * as fs from "node:fs";

const FULL = "לוגו סופי משקי דן.png";
const SYMBOL = "סמליל בלבד.png";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

fs.mkdirSync("public/logos", { recursive: true });
fs.mkdirSync("public/icons", { recursive: true });

// לוגו הכותרת – הלוגו המלא בגודל סביר לרשת.
await sharp(FULL).resize({ width: 700 }).png().toFile("public/logos/dan-farms.png");

// אייקון מרובע מהסמליל על רקע לבן, עם שוליים (padding).
async function squareIcon(size, padRatio, out, { flatten = true } = {}) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const pad = Math.round((size - inner) / 2);
  let img = sharp(SYMBOL)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: flatten ? WHITE : { r: 0, g: 0, b: 0, alpha: 0 } });
  if (flatten) img = img.flatten({ background: WHITE });
  await img.png().toFile(out);
}

// אייקוני PWA (מתוך manifest.ts)
await squareIcon(192, 0.06, "public/icons/icon-192.png");
await squareIcon(512, 0.06, "public/icons/icon-512.png");
await squareIcon(512, 0.16, "public/icons/icon-maskable-512.png"); // אזור בטוח ל-maskable

// favicon של הדפדפן (App Router מזהה app/icon.png) – סמליל על רקע שקוף
await squareIcon(256, 0.04, "app/icon.png", { flatten: false });
// אייקון iOS להוספה למסך הבית – רקע לבן
await squareIcon(180, 0.1, "app/apple-icon.png");

console.log("נוצרו: dan-farms.png, icon-192/512/maskable, app/icon.png, app/apple-icon.png");

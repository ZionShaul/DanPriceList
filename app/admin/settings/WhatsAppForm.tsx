"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWhatsApp } from "@/lib/actions/settings";

export default function WhatsAppForm({
  number,
  message,
  enabled,
}: {
  number: string;
  message: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const res = await updateWhatsApp(new FormData(e.currentTarget));
    setPending(false);
    if (!res.ok) setMsg({ type: "error", text: res.error });
    else {
      setMsg({ type: "ok", text: "ההגדרות נשמרו." });
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-brand-line bg-brand-surface p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-brand-ink">כפתור תמיכה בוואטסאפ</h2>
        <p className="mt-1 text-sm text-brand-muted">
          כפתור צף במסכי המשתמש שפותח שיחת וואטסאפ למספר שתגדיר, עם הודעת פתיחה מוכנה. אם מבוטל –
          הכפתור לא יוצג.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-brand-ink">מספר וואטסאפ</span>
        <input
          name="number"
          type="tel"
          dir="ltr"
          defaultValue={number}
          placeholder="972501234567"
          className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
        />
        <span className="mt-1 block text-xs text-brand-muted">
          פורמט בינלאומי ללא + או 0 מוביל. לדוגמה למספר 050-1234567 יש להזין 972501234567.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-brand-ink">הודעת ברירת מחדל</span>
        <textarea
          name="message"
          rows={3}
          defaultValue={message}
          placeholder="שלום, אני זקוק/ה לתמיכה במחירון משקי דן"
          className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
        />
        <span className="mt-1 block text-xs text-brand-muted">
          ההודעה תופיע מוכנה בתיבת הצ׳אט; המשתמש יכול לערוך לפני השליחה.
        </span>
      </label>

      <label className="flex items-center gap-2">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={enabled}
          className="h-5 w-5 accent-brand-primary"
        />
        <span className="text-sm font-medium text-brand-ink">הצגת כפתור הוואטסאפ למשתמשים</span>
      </label>

      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-brand-primary" : "text-brand-danger"}`}>
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "שומר..." : "שמירה"}
      </button>
    </form>
  );
}

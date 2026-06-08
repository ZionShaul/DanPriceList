"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClickSense } from "@/lib/actions/settings";

export default function SettingsForm({ url, enabled }: { url: string; enabled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    const res = await updateClickSense(fd);
    setPending(false);
    if (!res.ok) setMessage({ type: "error", text: res.error });
    else {
      setMessage({ type: "ok", text: "ההגדרות נשמרו." });
      router.refresh();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-brand-line bg-brand-surface p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-brand-ink">קישור למערכת קליקסנס</h2>
        <p className="mt-1 text-sm text-brand-muted">
          הקישור ייפתח בלשונית חדשה דרך הכפתור &quot;לפירוט מלא ונתונים היסטוריים&quot;. אם הכפתור
          מבוטל - הוא לא יוצג למשתמשים.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-brand-ink">כתובת URL</span>
        <input
          name="url"
          type="url"
          dir="ltr"
          defaultValue={url}
          placeholder="https://..."
          className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={enabled}
          className="h-5 w-5 accent-brand-primary"
        />
        <span className="text-sm font-medium text-brand-ink">הצגת כפתור קליקסנס למשתמשים</span>
      </label>

      {message && (
        <p
          className={`text-sm ${
            message.type === "ok" ? "text-brand-primary" : "text-brand-danger"
          }`}
        >
          {message.text}
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

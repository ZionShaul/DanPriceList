"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // shouldCreateUser:false – מונע הרשמה עצמית (סעיף 4/5)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError("האימייל אינו רשום במערכת או שאירעה שגיאה. פנה/י למנהל המערכת.");
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("הקוד שגוי או שפג תוקפו. נסה/י שוב.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-brand-surface p-6 shadow-sm">
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-ink">אימייל</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-base text-brand-ink outline-none focus:border-brand-primary"
            />
          </label>
          {error && <p className="text-sm text-brand-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "שולח..." : "שליחת קוד התחברות"}
          </button>
          <p className="text-center text-xs text-brand-muted">
            יישלח קוד חד-פעמי לאימייל. הכניסה נשמרת במכשיר.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-brand-muted">
            שלחנו קוד לאימייל <span dir="ltr" className="font-medium">{email}</span>
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-ink">קוד אימות</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="______"
              className="w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-brand-ink outline-none focus:border-brand-primary"
            />
          </label>
          {error && <p className="text-sm text-brand-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "מאמת..." : "כניסה"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="w-full text-center text-sm text-brand-muted underline"
          >
            החלפת אימייל
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function BlockedNotice() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.refresh();
  }
  return (
    <div className="w-full max-w-sm rounded-2xl border border-brand-line bg-brand-surface p-6 text-center shadow-sm">
      <h1 className="mb-2 text-xl font-bold text-brand-danger">החשבון חסום</h1>
      <p className="mb-6 text-sm text-brand-muted">
        חשבונך אינו פעיל כרגע. לפרטים נוספים פנה/י למנהל המערכת.
      </p>
      <button
        onClick={signOut}
        className="w-full rounded-xl border border-brand-line px-4 py-3 text-sm font-medium text-brand-ink"
      >
        חזרה למסך ההתחברות
      </button>
    </div>
  );
}

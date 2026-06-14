"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// כפתור יציאה – מנתק את ה-session ומחזיר למסך ההתחברות (אזור הניהול בלבד).
export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={pending}
      className="btn rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25 disabled:opacity-60"
    >
      {pending ? "מתנתק..." : "יציאה"}
    </button>
  );
}

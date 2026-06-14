import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getProfileAnyStatus } from "@/lib/auth";
import LoginForm from "./LoginForm";
import BlockedNotice from "./BlockedNotice";

export const metadata = { title: "התחברות - מחירון משקי דן" };

export default async function LoginPage() {
  const user = await getAuthUser();
  if (user) {
    const profile = await getProfileAnyStatus(user.id);
    if (profile && profile.status === "active") redirect("/");
    if (profile && profile.status === "blocked") {
      return (
        <main className="flex flex-1 items-center justify-center p-6">
          <BlockedNotice />
        </main>
      );
    }
  }

  // קישור "בקשה לרישום משתמש" – דרך RPC הנגיש גם ללא התחברות
  const supabase = await createClient();
  const { data: regData } = await supabase.rpc("get_registration_link");
  const reg = (regData as { url: string | null; enabled: boolean }[] | null)?.[0] ?? null;
  const showRegistration = Boolean(reg?.enabled && reg?.url);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/dan-farms.png" alt="משקי דן" className="h-12 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-brand-ink">מחירון משקי דן</h1>
          <p className="mt-1 text-sm text-brand-muted">הדברה ודשן</p>
        </div>
        <LoginForm />

        {showRegistration && (
          <a
            href={reg!.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-primary bg-brand-primary-light px-4 py-3 text-sm font-semibold text-brand-primary-dark"
          >
            בקשה לרישום משתמש
            <span aria-hidden>↗</span>
          </a>
        )}
      </div>
    </main>
  );
}

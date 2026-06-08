import { redirect } from "next/navigation";
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

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary text-2xl font-bold text-white">
            דן
          </div>
          <h1 className="text-2xl font-bold text-brand-ink">מחירון משקי דן</h1>
          <p className="mt-1 text-sm text-brand-muted">הדברה ודשן</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

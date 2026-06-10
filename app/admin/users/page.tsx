import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import UsersManager from "./UsersManager";
import type { Organization, Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: users }, { data: orgs }, authList] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, role, status, organization_id, show_purchases, show_my_purchases, organization:organizations(id, name)",
      )
      .order("full_name"),
    supabase.from("organizations").select("id, name").order("name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // מיפוי כניסה אחרונה לפי מזהה משתמש (מתוך Supabase Auth)
  const lastLogin: Record<string, string | null> = {};
  for (const u of authList.data?.users ?? []) {
    lastLogin[u.id] = u.last_sign_in_at ?? null;
  }

  return (
    <UsersManager
      users={
        (users as unknown as (Profile & {
          organization: { id: string; name: string } | null;
        })[]) ?? []
      }
      organizations={(orgs as unknown as Pick<Organization, "id" | "name">[]) ?? []}
      lastLogin={lastLogin}
      currentUserId={me.id}
    />
  );
}

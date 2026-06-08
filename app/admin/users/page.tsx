import { createClient } from "@/lib/supabase/server";
import UsersManager from "./UsersManager";
import type { Organization, Profile } from "@/lib/types";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const [{ data: users }, { data: orgs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, status, organization_id, organization:organizations(id, name)")
      .order("full_name"),
    supabase.from("organizations").select("id, name").order("name"),
  ]);

  return (
    <UsersManager
      users={
        (users as unknown as (Profile & {
          organization: { id: string; name: string } | null;
        })[]) ?? []
      }
      organizations={(orgs as unknown as Pick<Organization, "id" | "name">[]) ?? []}
    />
  );
}

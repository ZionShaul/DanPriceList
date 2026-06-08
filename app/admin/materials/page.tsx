import { createClient } from "@/lib/supabase/server";
import MaterialsManager, { type MaterialWithAliases, type UnmappedItem } from "./MaterialsManager";

export default async function AdminMaterialsPage() {
  const supabase = await createClient();

  const [{ data: materials }, { data: unmapped }] = await Promise.all([
    supabase
      .from("materials_catalog")
      .select("id, canonical_name, status, aliases:material_aliases(id, alias_name, sku)")
      .order("canonical_name"),
    supabase.rpc("get_unmapped_materials"),
  ]);

  return (
    <MaterialsManager
      materials={(materials as unknown as MaterialWithAliases[]) ?? []}
      unmapped={(unmapped as unknown as UnmappedItem[]) ?? []}
    />
  );
}

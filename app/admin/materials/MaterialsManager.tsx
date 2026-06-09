"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMaterial,
  mapAliasToMaterial,
  createMaterialFromUnmapped,
} from "@/lib/actions/materials";
import CatalogImport from "./CatalogImport";

export interface MaterialWithAliases {
  id: string;
  canonical_name: string;
  status: string;
  aliases: { id: string; alias_name: string; sku: string | null }[];
}
export interface UnmappedItem {
  product_description: string;
  sku: string | null;
  occurrences: number;
}

export default function MaterialsManager({
  materials,
  unmapped,
}: {
  materials: MaterialWithAliases[];
  unmapped: UnmappedItem[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function addMaterial() {
    if (!newName.trim()) return;
    setError(null);
    const res = await createMaterial(newName);
    if (!res.ok) return setError(res.error);
    setNewName("");
    router.refresh();
  }

  async function mapExisting(desc: string, sku: string | null, materialId: string) {
    if (!materialId) return;
    setError(null);
    const res = await mapAliasToMaterial(materialId, desc, sku);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function createFromUnmapped(desc: string, sku: string | null) {
    setError(null);
    const res = await createMaterialFromUnmapped(desc, sku);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-brand-ink">קטלוג חומרים</h1>

      {error && (
        <p className="rounded-xl bg-brand-danger/10 px-4 py-2 text-sm text-brand-danger">{error}</p>
      )}

      {/* ייבוא קטלוג מאקסל (סעיף 3) */}
      <CatalogImport />

      {/* חומרים לא ממופים (סעיף 8.2) */}
      <section className="rounded-2xl border border-brand-line bg-brand-surface p-5">
        <h2 className="mb-1 text-base font-semibold text-brand-warning">
          חומרים לא ממופים ({unmapped.length})
        </h2>
        <p className="mb-3 text-sm text-brand-muted">
          חומרים אלו מוצגים למשתמשים בשמם המקורי. ניתן לשייך אותם לחומר תקני קיים או ליצור חדש.
        </p>
        {unmapped.length === 0 ? (
          <p className="text-sm text-brand-muted">כל החומרים בקובץ הפעיל ממופים. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {unmapped.map((u) => (
              <li
                key={u.product_description}
                className="flex flex-col gap-2 rounded-xl border border-brand-line bg-brand-bg p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium text-brand-ink">{u.product_description}</span>
                  <span className="mr-2 text-xs text-brand-muted">({u.occurrences} רכישות)</span>
                  {u.sku && (
                    <span className="mr-2 text-xs text-brand-muted" dir="ltr">
                      מק״ט {u.sku}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => mapExisting(u.product_description, u.sku, e.target.value)}
                    className="rounded-lg border border-brand-line bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="" disabled>
                      שיוך לחומר קיים…
                    </option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.canonical_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => createFromUnmapped(u.product_description, u.sku)}
                    className="rounded-lg border border-brand-primary px-3 py-1.5 text-sm font-semibold text-brand-primary"
                  >
                    צור חדש
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* יצירת חומר תקני */}
      <div className="flex items-end gap-2 rounded-2xl border border-brand-line bg-brand-surface p-4">
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium text-brand-ink">חומר תקני חדש</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="לדוגמה: אוראן 32%"
            className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5"
          />
        </label>
        <button
          onClick={addMaterial}
          className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          הוספה
        </button>
      </div>

      {/* רשימת חומרים תקניים */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-brand-ink">חומרים תקניים ({materials.length})</h2>
        {materials.length === 0 ? (
          <p className="text-sm text-brand-muted">עדיין אין חומרים תקניים.</p>
        ) : (
          <ul className="space-y-2">
            {materials.map((m) => (
              <li key={m.id} className="rounded-xl border border-brand-line bg-brand-surface p-3">
                <div className="font-semibold text-brand-ink">{m.canonical_name}</div>
                {m.aliases.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {m.aliases.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full bg-brand-bg px-2 py-0.5 text-xs text-brand-muted"
                      >
                        {a.alias_name}
                        {a.sku ? ` · ${a.sku}` : ""}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

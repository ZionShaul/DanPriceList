"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SearchSuggestion } from "@/lib/types";

// שדה חיפוש עם הצעות מתוך הקטלוג + אפשרות לפתוח את כל הרשימה ולבחור (סעיף 10.1)
export default function SearchBox() {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [allItems, setAllItems] = useState<SearchSuggestion[] | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // חיפוש מקלדת (כשלא במצב "כל הרשימה")
  useEffect(() => {
    if (showAll) return;
    const q = query.trim();
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        setOpen(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase.rpc("search_materials", { p_query: q });
      setResults((data as SearchSuggestion[]) ?? []);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, showAll]);

  async function toggleAll() {
    if (showAll) {
      setShowAll(false);
      setOpen(false);
      return;
    }
    setShowAll(true);
    setOpen(true);
    if (allItems) return;
    setLoadingAll(true);
    // get_material_prices ללא פרמטרים מחזיר את כל המוצרים בטעינה הפעילה (security definer)
    const { data } = await supabase.rpc("get_material_prices");
    const items = ((data as { material_key: string; display_name: string; is_mapped: boolean }[]) ?? []).map(
      (r) => ({ material_key: r.material_key, display_name: r.display_name, is_mapped: r.is_mapped }),
    );
    setAllItems(items);
    setLoadingAll(false);
  }

  function selectMaterial(key: string) {
    router.push(`/material?key=${encodeURIComponent(key)}`);
  }

  const q = query.trim().toLowerCase();
  const listToShow = showAll
    ? (allItems ?? []).filter((i) => !q || i.display_name.toLowerCase().includes(q))
    : results;
  const busy = loading || loadingAll;

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (showAll || results.length) && setOpen(true)}
          placeholder="חיפוש חומר לפי שם, שם חלקי או מק״ט"
          className="w-full rounded-2xl border border-brand-line bg-brand-surface px-5 py-4 text-base text-brand-ink shadow-sm outline-none focus:border-brand-primary"
        />
        <button
          type="button"
          onClick={toggleAll}
          aria-pressed={showAll}
          className={`shrink-0 rounded-2xl border px-4 text-sm font-semibold shadow-sm ${
            showAll
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-brand-line bg-brand-surface text-brand-primary"
          }`}
        >
          {showAll ? "סגירה" : "כל הרשימה"}
        </button>
      </div>

      {open && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 max-h-96 overflow-auto rounded-2xl border border-brand-line bg-brand-surface shadow-lg">
          {busy && (
            <li className="px-4 py-4 text-center text-sm text-brand-muted">טוען…</li>
          )}
          {!busy &&
            listToShow.map((r) => (
              <li key={r.material_key}>
                <button
                  onClick={() => selectMaterial(r.material_key)}
                  className="flex w-full items-center justify-between gap-2 border-b border-brand-line/60 px-4 py-3 text-right text-brand-ink last:border-0 hover:bg-brand-primary-light"
                >
                  <span>{r.display_name}</span>
                </button>
              </li>
            ))}
          {!busy && listToShow.length === 0 && (
            <li className="px-4 py-4 text-center text-sm text-brand-muted">
              {showAll ? "אין מוצרים להצגה" : "לא נמצאו תוצאות"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

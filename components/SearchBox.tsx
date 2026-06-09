"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SearchSuggestion } from "@/lib/types";

// שדה חיפוש עם הצעות מתוך קטלוג החומרים וחומרים לא ממופים (סעיף 10.1)
export default function SearchBox() {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
  }, [query]);

  function selectMaterial(key: string) {
    router.push(`/material?key=${encodeURIComponent(key)}`);
  }

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="חיפוש חומר לפי שם, שם חלקי או מק״ט"
        className="w-full rounded-2xl border border-brand-line bg-brand-surface px-5 py-4 text-base text-brand-ink shadow-sm outline-none focus:border-brand-primary"
      />
      {open && (results.length > 0 || (!loading && query.trim().length >= 2)) && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-2xl border border-brand-line bg-brand-surface shadow-lg">
          {results.map((r) => (
            <li key={r.material_key}>
              <button
                onClick={() => selectMaterial(r.material_key)}
                className="flex w-full items-center justify-between gap-2 border-b border-brand-line/60 px-4 py-3 text-right text-brand-ink last:border-0 hover:bg-brand-primary-light"
              >
                <span>{r.display_name}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && !loading && (
            <li className="px-4 py-4 text-center text-sm text-brand-muted">לא נמצאו תוצאות</li>
          )}
        </ul>
      )}
      {loading && <p className="mt-2 text-center text-xs text-brand-muted">מחפש...</p>}
    </div>
  );
}

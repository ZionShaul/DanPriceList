"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAndParse } from "@/lib/actions/uploads";

export default function UploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const res = await uploadAndParse(formData);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/admin/upload?id=${res.uploadId}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-brand-line bg-brand-surface p-5"
    >
      <h2 className="mb-1 text-lg font-bold text-brand-ink">טעינת קובץ אקסל חודשי</h2>
      <p className="mb-4 text-sm text-brand-muted">
        בחר/י קובץ אקסל. הנתונים לא ישפיעו על המשתמשים עד הפרסום.
      </p>
      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-brand-ink">
          שם הטעינה (יוצג למשתמשים)
        </span>
        <input
          name="title"
          type="text"
          placeholder="לדוגמה: מחירון מאי 2026"
          className="w-full rounded-xl border border-brand-line bg-white px-3 py-2.5 text-brand-ink outline-none focus:border-brand-primary"
        />
        <span className="mt-1 block text-xs text-brand-muted">
          אם יושאר ריק, יוצג שם הקובץ.
        </span>
      </label>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-line bg-brand-bg px-4 py-8 text-center">
        <span className="text-3xl" aria-hidden>
          📄
        </span>
        <span className="text-sm font-medium text-brand-ink">
          {fileName ?? "לחצ/י לבחירת קובץ (.xlsx / .xls)"}
        </span>
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          required
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      {error && <p className="mt-3 text-sm text-brand-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "מנתח את הקובץ..." : "טעינה וניתוח"}
      </button>
    </form>
  );
}

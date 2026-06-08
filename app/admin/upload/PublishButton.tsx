"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { publishUpload } from "@/lib/actions/uploads";

export default function PublishButton({
  uploadId,
  alreadyPublished,
}: {
  uploadId: string;
  alreadyPublished: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (!confirm("לפרסם את הטעינה? הנתונים יוצגו לכל המשתמשים והטעינה הקודמת תהפוך להיסטורית.")) {
      return;
    }
    setPending(true);
    setError(null);
    const res = await publishUpload(uploadId);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (alreadyPublished) {
    return (
      <div className="rounded-xl bg-brand-primary-light px-4 py-3 text-center text-sm font-semibold text-brand-primary-dark">
        ✓ טעינה זו פעילה כעת ומוצגת למשתמשים
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={publish}
        disabled={pending}
        className="w-full rounded-xl bg-brand-primary px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "מפרסם..." : "פרסום הטעינה"}
      </button>
      {error && <p className="mt-2 text-sm text-brand-danger">{error}</p>}
    </div>
  );
}

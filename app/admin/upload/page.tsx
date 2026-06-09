import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatNumber, formatCurrency, formatDate } from "@/lib/format";
import UploadForm from "./UploadForm";
import PublishButton from "./PublishButton";
import type { MonthlyUpload } from "@/lib/types";

export default async function AdminUploadPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="space-y-6">
      <UploadForm />
      {id && <UploadSummary uploadId={id} />}
    </div>
  );
}

async function UploadSummary({ uploadId }: { uploadId: string }) {
  const supabase = await createClient();

  const { data: uploadData } = await supabase
    .from("monthly_uploads")
    .select("*, uploader:profiles!monthly_uploads_uploaded_by_fkey(full_name)")
    .eq("id", uploadId)
    .single();

  if (!uploadData) {
    return <p className="text-brand-muted">לא נמצאה טעינה.</p>;
  }
  const upload = uploadData as unknown as MonthlyUpload & {
    uploader: { full_name: string } | null;
  };

  const [{ data: sample }, { data: rejected }, { data: unmapped }] = await Promise.all([
    supabase
      .from("purchase_rows")
      .select(
        "id, supplier, product_description, quantity, unit_price, total_price, purchase_date, material:materials_catalog(canonical_name)",
      )
      .eq("upload_id", uploadId)
      .limit(8),
    supabase.from("rejected_rows").select("id, reason").eq("upload_id", uploadId).limit(8),
    supabase.rpc("get_unmapped_materials", { p_upload_id: uploadId }),
  ]);

  type SampleRow = {
    id: string;
    product_description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    purchase_date: string | null;
    material: { canonical_name: string } | null;
  };
  const sampleRows = (sample as unknown as SampleRow[]) ?? [];
  const rejectedRows = (rejected as unknown as { id: string; reason: string }[]) ?? [];
  const unmappedRows =
    (unmapped as unknown as { product_description: string; occurrences: number }[]) ?? [];

  const stats: [string, string][] = [
    ["שם הטעינה", upload.title || upload.file_name],
    ["שם הקובץ", upload.file_name],
    ["תאריך ושעת טעינה", formatDateTime(upload.uploaded_at)],
    ["נטען על ידי", upload.uploader?.full_name ?? "—"],
    ["מספר שורות בקובץ", formatNumber(upload.total_rows)],
    ["רכישות תקינות שנקלטו", formatNumber(upload.valid_rows)],
    ["שורות שהוחרגו", formatNumber(upload.rejected_rows)],
    ["ארגונים שזוהו", formatNumber(upload.organizations_count)],
    ["חומרים שזוהו", formatNumber(upload.materials_count)],
    ["חומרים לא ממופים", formatNumber(upload.unmapped_count)],
  ];

  const statusLabel =
    upload.status === "published"
      ? "פעילה"
      : upload.status === "historical"
        ? "היסטורית"
        : "טיוטה (טרם פורסמה)";

  return (
    <section className="space-y-5 rounded-2xl border border-brand-line bg-brand-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-ink">סיכום טעינה</h2>
        <span className="rounded-full bg-brand-bg px-3 py-1 text-xs font-medium text-brand-muted">
          {statusLabel}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-brand-line bg-brand-bg p-3">
            <dt className="text-xs text-brand-muted">{k}</dt>
            <dd className="mt-0.5 font-semibold text-brand-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {unmappedRows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-warning">
            חומרים לא ממופים ({unmappedRows.length})
          </h3>
          <ul className="flex flex-wrap gap-2">
            {unmappedRows.map((u) => (
              <li
                key={u.product_description}
                className="rounded-full bg-brand-warning/10 px-3 py-1 text-xs text-brand-warning"
              >
                {u.product_description} ({u.occurrences})
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-brand-muted">
            ניתן למפות חומרים אלו במסך &quot;קטלוג חומרים&quot;.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-ink">תצוגה מקדימה - רכישות</h3>
          <div className="table-scroll rounded-xl border border-brand-line">
            <table className="w-full min-w-[480px] text-xs">
              <thead className="bg-brand-primary-light text-brand-primary-dark">
                <tr>
                  <th className="px-2 py-1.5 text-right">תאריך</th>
                  <th className="px-2 py-1.5 text-right">חומר</th>
                  <th className="px-2 py-1.5 text-right">כמות</th>
                  <th className="px-2 py-1.5 text-right">מחיר</th>
                  <th className="px-2 py-1.5 text-right">סה״כ</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map(
                  (r) => (
                    <tr key={r.id} className="border-t border-brand-line/60">
                      <td className="px-2 py-1.5">{formatDate(r.purchase_date)}</td>
                      <td className="px-2 py-1.5">
                        {r.material?.canonical_name ?? r.product_description}
                      </td>
                      <td className="px-2 py-1.5" dir="ltr">
                        {formatNumber(r.quantity)}
                      </td>
                      <td className="px-2 py-1.5" dir="ltr">
                        {formatCurrency(r.unit_price)}
                      </td>
                      <td className="px-2 py-1.5" dir="ltr">
                        {formatCurrency(r.total_price)}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-ink">דוגמת חריגות</h3>
          {rejectedRows.length > 0 ? (
            <ul className="space-y-1 text-xs text-brand-muted">
              {rejectedRows.map((r) => (
                <li key={r.id} className="rounded-lg bg-brand-bg px-3 py-1.5">
                  {r.reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-brand-muted">אין חריגות.</p>
          )}
        </div>
      </div>

      <PublishButton uploadId={uploadId} alreadyPublished={upload.status === "published"} />
    </section>
  );
}

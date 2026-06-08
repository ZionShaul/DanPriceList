import { createClient } from "@/lib/supabase/server";
import HistoryManager, { type UploadHistoryRow } from "./HistoryManager";

export default async function AdminHistoryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_uploads")
    .select(
      "id, file_name, status, uploaded_at, published_at, total_rows, valid_rows, rejected_rows, uploader:profiles!monthly_uploads_uploaded_by_fkey(full_name)",
    )
    .order("uploaded_at", { ascending: false });

  return <HistoryManager uploads={(data as unknown as UploadHistoryRow[]) ?? []} />;
}

import Spinner from "@/components/Spinner";

// מסך טעינה לכלל מסכי המשתמש – מוצג אוטומטית במעבר בין מסכים ובטעינת נתוני מוצר.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

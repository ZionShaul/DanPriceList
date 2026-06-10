"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "סקירה", exact: true },
  { href: "/admin/upload", label: "טעינת קובץ" },
  { href: "/admin/users", label: "ניהול משתמשים" },
  { href: "/admin/materials", label: "קטלוג חומרים" },
  { href: "/admin/history", label: "היסטוריית טעינות" },
  { href: "/admin/analytics", label: "סטטיסטיקה" },
  { href: "/admin/settings", label: "הגדרות מערכת" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-primary text-white"
                : "text-brand-ink hover:bg-brand-primary-light"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary-light"
      >
        ← מסכי משתמש
      </Link>
    </nav>
  );
}

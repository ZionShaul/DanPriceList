"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SEARCH_TAB = { href: "/", label: "חיפוש מחירון", icon: "🔍" };
const MY_PURCHASES_TAB = { href: "/my-purchases", label: "הרכישות שלי", icon: "🧾" };
const ADMIN_TAB = { href: "/admin", label: "ניהול", icon: "⚙️" };

export default function BottomNav({
  isAdmin,
  showMyPurchases = true,
}: {
  isAdmin: boolean;
  showMyPurchases?: boolean;
}) {
  const pathname = usePathname();
  const tabs = [
    SEARCH_TAB,
    ...(showMyPurchases ? [MY_PURCHASES_TAB] : []),
    ...(isAdmin ? [ADMIN_TAB] : []),
  ];

  return (
    <nav className="sticky bottom-0 z-10 border-t border-brand-line bg-brand-surface">
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? "text-brand-primary" : "text-brand-muted"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

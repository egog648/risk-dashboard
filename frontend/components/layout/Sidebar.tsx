"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "⬡" },
  { href: "/equities", label: "Equities", icon: "📈" },
  { href: "/credit", label: "Credit", icon: "🏦" },
  { href: "/hard-assets", label: "Hard Assets", icon: "🏗️" },
  { href: "/cash", label: "Cash", icon: "💵" },
  { href: "/portfolio", label: "Portfolio", icon: "⚖️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col py-6 px-3 shrink-0">
      <div className="mb-8 px-2">
        <h1 className="text-sm font-bold text-white tracking-wide uppercase">
          Risk Dashboard
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Macro Analytics</p>
      </div>

      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

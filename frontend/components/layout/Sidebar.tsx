"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MACRO_NAV = [
  { href: "/", label: "Overview", icon: "⬡" },
  { href: "/equities", label: "Equities", icon: "📈" },
  { href: "/credit", label: "Credit", icon: "🏦" },
  { href: "/hard-assets", label: "Hard Assets", icon: "🏗️" },
  { href: "/cash", label: "Cash", icon: "💵" },
  { href: "/portfolio", label: "Portfolio", icon: "⚖️" },
];

const PRACTICE_NAV = [
  { href: "/tickers", label: "Tickers", icon: "📋" },
];

export function Sidebar() {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-[#2a5d8f] text-white"
        : "text-[#a8bdd4] hover:text-white hover:bg-[#254d73]"
    }`;
  };

  return (
    <aside className="w-52 bg-ff-navy border-r border-[#2a5d8f] flex flex-col py-6 px-3 shrink-0">
      <div className="mb-6 px-2">
        <p className="text-[10px] font-bold text-[#a8bdd4] tracking-[2px] uppercase">
          Finesse Funds
        </p>
        <h1 className="text-sm font-extrabold text-white tracking-wide mt-1">
          Risk Dashboard
        </h1>
      </div>

      <nav className="space-y-1 flex-1">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#6b8299] mb-1">
          Macro
        </p>
        {MACRO_NAV.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}

        <p className="px-3 pt-4 text-[10px] font-bold uppercase tracking-wider text-[#6b8299] mb-1">
          Practice
        </p>
        {PRACTICE_NAV.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <span className="text-base">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

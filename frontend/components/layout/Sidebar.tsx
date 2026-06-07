"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  TrendingUp,
  Landmark,
  Building2,
  Banknote,
  Scale,
  User,
  ClipboardPen,
  List,
} from "lucide-react";

type NavIconType = LucideIcon | "overview";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconType;
};

const MACRO_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/equities", label: "Equities", icon: TrendingUp },
  { href: "/credit", label: "Credit", icon: Landmark },
  { href: "/hard-assets", label: "Hard Assets", icon: Building2 },
  { href: "/cash", label: "Cash", icon: Banknote },
  { href: "/portfolio", label: "Portfolio", icon: Scale },
];

const PRACTICE_NAV: NavItem[] = [
  { href: "/clients", label: "Clients", icon: User },
  { href: "/profiler", label: "Profiler", icon: ClipboardPen },
  { href: "/tickers", label: "Tickers", icon: List },
];

function NavIcon({ icon }: { icon: NavIconType }) {
  if (icon === "overview") {
    return (
      <span className="w-4 h-4 flex items-center justify-center text-base leading-none">
        ⬡
      </span>
    );
  }
  const Icon = icon;
  return <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden />;
}

export function Sidebar() {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const isActive =
      pathname === href || (href === "/profiler" && pathname.startsWith("/profiler"));
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
            <NavIcon icon={icon} />
            {label}
          </Link>
        ))}

        <p className="px-3 pt-4 text-[10px] font-bold uppercase tracking-wider text-[#6b8299] mb-1">
          Practice
        </p>
        {PRACTICE_NAV.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={linkClass(href)}>
            <NavIcon icon={icon} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

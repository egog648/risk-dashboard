import { ReactNode } from "react";

interface FinesseHeaderProps {
  brand?: string;
  title: string;
  subtitle?: string;
}

export function FinesseHeader({
  brand = "Finesse Funds",
  title,
  subtitle,
}: FinesseHeaderProps) {
  return (
    <div className="bg-ff-navy text-white px-6 py-5 border-b-[3px] border-[#2a5d8f] -mx-6 -mt-6 mb-6">
      <div className="text-[11px] uppercase tracking-[2.5px] text-white/70 mb-1">
        {brand}
      </div>
      <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-xs text-white/75 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

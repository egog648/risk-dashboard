import { ReactNode } from "react";

interface FinesseCardProps {
  children: ReactNode;
  label?: string;
  title?: string;
  className?: string;
  padding?: "md" | "lg";
}

export function FinesseCard({
  children,
  label,
  title,
  className = "",
  padding = "md",
}: FinesseCardProps) {
  const paddingClass = padding === "lg" ? "p-5" : "p-4";

  return (
    <div
      className={`bg-white rounded-[14px] ${paddingClass} border border-ff-border shadow-[0_2px_12px_rgba(26,58,92,0.08)] ${className}`}
    >
      {label && (
        <div className="text-[11px] font-bold text-ff-muted uppercase tracking-wide text-center mb-3">
          {label}
        </div>
      )}
      {title && (
        <h3 className="text-sm font-bold text-ff-navy uppercase tracking-wide mb-3 border-b border-[#e8edf2] pb-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

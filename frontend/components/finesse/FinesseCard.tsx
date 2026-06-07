import { ReactNode } from "react";

interface FinesseCardProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function FinesseCard({ children, label, className = "" }: FinesseCardProps) {
  return (
    <div
      className={`bg-white rounded-[14px] p-4 border border-ff-border shadow-[0_2px_12px_rgba(26,58,92,0.08)] ${className}`}
    >
      {label && (
        <div className="text-[11px] font-bold text-ff-muted uppercase tracking-wide text-center mb-3">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

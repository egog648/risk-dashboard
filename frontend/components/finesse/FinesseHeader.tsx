import Link from "next/link";

interface FinesseHeaderProps {
  brand?: string;
  title: string;
  subtitle?: string;
  /** When false, skips -mt-6 so content above isn't overlapped. Ignored when backHref is set. */
  flushTop?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function FinesseHeader({
  brand = "Finesse Funds",
  title,
  subtitle,
  flushTop = true,
  backHref,
  backLabel,
}: FinesseHeaderProps) {
  const pullIntoMainPadding = flushTop && !backHref;

  return (
    <div className="-mx-6 mb-6">
      {backHref && backLabel && (
        <div className="px-6 pb-3">
          <Link
            href={backHref}
            className="inline-block text-xs font-medium text-ff-text-secondary hover:text-ff-navy"
          >
            ← {backLabel}
          </Link>
        </div>
      )}
      <div
        className={`bg-ff-navy text-white px-6 py-5 border-b-[3px] border-[#2a5d8f] ${
          pullIntoMainPadding ? "-mt-6" : ""
        }`}
      >
        <div className="text-[11px] uppercase tracking-[2.5px] text-white/70 mb-1">
          {brand}
        </div>
        <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-white/75 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

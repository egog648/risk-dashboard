"use client";

interface FrontierDetailToggleProps {
  highDetail: boolean;
  onChange: (highDetail: boolean) => void;
}

export function FrontierDetailToggle({
  highDetail,
  onChange,
}: FrontierDetailToggleProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-ff-muted cursor-pointer mt-2">
      <input
        type="checkbox"
        checked={highDetail}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-ff-blue"
      />
      High detail (slower — 50 frontier points, 2000 Monte Carlo samples)
    </label>
  );
}

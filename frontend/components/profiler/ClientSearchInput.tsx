"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Client } from "@/types/clients";

interface ClientSearchInputProps {
  clients: Client[];
  value: string;
  selectedClientId: number | "";
  onChange: (name: string) => void;
  onSelectClient: (client: Client | null) => void;
  isLoading?: boolean;
}

export function ClientSearchInput({
  clients,
  value,
  selectedClientId,
  onChange,
  onSelectClient,
  isLoading = false,
}: ClientSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, value]);

  const showCreateNew =
    value.trim().length > 0 &&
    !clients.some((c) => c.name.toLowerCase() === value.trim().toLowerCase());

  useEffect(() => {
    setHighlight(0);
  }, [value, filtered.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: Array<{ type: "client"; client: Client } | { type: "new" }> = [
    ...filtered.map((client) => ({ type: "client" as const, client })),
    ...(showCreateNew ? [{ type: "new" as const }] : []),
  ];

  const selectOption = (index: number) => {
    const opt = options[index];
    if (!opt) return;
    if (opt.type === "client") {
      onSelectClient(opt.client);
      onChange(opt.client.name);
    } else {
      onSelectClient(null);
      onChange(value.trim());
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open && options.length > 0) {
      e.preventDefault();
      selectOption(highlight);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-bold text-ff-muted uppercase tracking-wide block mb-1.5">
        Client
      </label>
      <input
        type="text"
        className="w-full px-3 py-2.5 border-[1.5px] border-[#dde4ec] rounded-lg text-sm text-ff-navy bg-white outline-none focus:border-ff-navy placeholder:text-[#b0bec5]"
        placeholder="Search or type a client name..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelectClient(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {selectedClientId && (
        <p className="text-[11px] text-ff-green mt-1 font-semibold">
          Editing existing client — profile will load below
        </p>
      )}

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-ff-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {isLoading && (
            <div className="px-3 py-2 text-xs text-ff-muted">Loading clients...</div>
          )}
          {!isLoading && options.length === 0 && (
            <div className="px-3 py-2 text-xs text-ff-muted italic">
              {clients.length === 0
                ? "No clients yet — type a name to create one on save"
                : "No matches — type a new name to create on save"}
            </div>
          )}
          {options.map((opt, idx) => (
            <button
              key={opt.type === "client" ? opt.client.id : "new"}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                idx === highlight ? "bg-[#eaf1f8] text-ff-navy" : "text-ff-text-secondary hover:bg-[#f6f9fc]"
              }`}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => selectOption(idx)}
            >
              {opt.type === "client" ? (
                <>
                  <span className="font-semibold text-ff-navy">{opt.client.name}</span>
                  {opt.client.current_profile_id ? (
                    <span className="text-xs text-ff-muted ml-2">has profile</span>
                  ) : (
                    <span className="text-xs text-ff-muted ml-2">no profile yet</span>
                  )}
                </>
              ) : (
                <span>
                  Create new client: <strong className="text-ff-navy">{value.trim()}</strong>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

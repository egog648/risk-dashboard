"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
  hasHoldings: boolean;
}

export function UploadZone({ onUpload, isUploading, hasHoldings }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="border-2 border-dashed border-[#c5d4e3] rounded-xl p-6 text-center bg-[#f8fafc] hover:border-ff-blue transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
      <Upload className="w-8 h-8 mx-auto text-ff-muted mb-2" />
      <p className="text-sm font-semibold text-ff-navy">
        {isUploading ? "Uploading…" : "Drop brokerage statement (JSON or CSV)"}
      </p>
      <p className="text-xs text-ff-muted mt-1">
        {hasHoldings
          ? "Upload replaces the latest holdings snapshot for this portfolio."
          : "Need a positions CSV with Symbol and Quantity (one row per holding). Summary/totals exports won't work."}
      </p>
    </div>
  );
}

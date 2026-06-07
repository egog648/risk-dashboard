"use client";

import Link from "next/link";
import { useState } from "react";
import { FinesseHeader } from "@/components/finesse/FinesseHeader";
import { FinesseCard } from "@/components/finesse/FinesseCard";
import { useClients, useCreateClient } from "@/hooks/useClients";

export default function ClientsPage() {
  const { data: clients, isLoading, isError } = useClients();
  const createClient = useCreateClient();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createClient.mutateAsync({ name: name.trim(), notes: notes.trim() || null });
    setName("");
    setNotes("");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <FinesseHeader
        title="Client Workspace"
        subtitle="Manage investors, profiles, and portfolio outlines"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinesseCard title="Add Client" padding="lg">
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              placeholder="Client name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-ff-border rounded-lg text-sm focus:border-ff-navy outline-none"
            />
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-ff-border rounded-lg text-sm focus:border-ff-navy outline-none resize-none"
            />
            <button
              type="submit"
              disabled={createClient.isPending || !name.trim()}
              className="px-4 py-2 bg-ff-navy text-white text-sm font-semibold rounded-lg hover:bg-[#254d73] disabled:opacity-50"
            >
              {createClient.isPending ? "Adding..." : "Add Client"}
            </button>
          </form>
        </FinesseCard>

        <FinesseCard title="Clients" padding="lg">
          {isLoading && <p className="text-sm text-ff-muted">Loading clients...</p>}
          {isError && (
            <p className="text-sm text-red-500">Failed to load clients. Is the backend running?</p>
          )}
          {clients?.length === 0 && (
            <p className="text-sm text-ff-muted italic text-center py-6">
              No clients yet. Add your first client to get started.
            </p>
          )}
          <div className="space-y-2">
            {clients?.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="block px-3 py-2.5 rounded-lg border border-[#e8edf2] hover:border-ff-navy hover:bg-[#f6f9fc] transition-colors"
              >
                <div className="font-bold text-ff-navy text-sm">{c.name}</div>
                <div className="text-xs text-ff-muted mt-0.5">
                  {c.portfolio_count} portfolio{c.portfolio_count !== 1 ? "s" : ""}
                  {c.current_profile_id ? " · Profile on file" : " · No profile yet"}
                </div>
              </Link>
            ))}
          </div>
        </FinesseCard>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TermsContent } from "@/components/TermsContent";

export function TermsModal({ show }: { show: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!show || accepted) return null;

  async function agree() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile/accept-terms", { method: "POST" });
    if (!res.ok) {
      setSaving(false);
      setError("Something went wrong — try again.");
      return;
    }
    setAccepted(true);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-pitch-950">
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-lg">
          <TermsContent />
        </div>
      </div>
      <div className="border-t border-pitch-800 px-5 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-chalk-dim">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            I&apos;ve read and agree to the Terms &amp; Conditions.
          </label>
          {error && <p className="text-xs text-sendoff">{error}</p>}
          <button onClick={agree} disabled={!checked || saving} className="btn-primary w-full disabled:opacity-50">
            {saving ? "Saving…" : "I agree"}
          </button>
        </div>
      </div>
    </div>
  );
}

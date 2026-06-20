"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WelcomeCard({ show }: { show: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(show);
  const [busy, setBusy] = useState(false);

  if (!visible) return null;

  async function dismiss() {
    setBusy(true);
    await fetch("/api/profile/dismiss-tutorial", { method: "POST" });
    setVisible(false);
    router.refresh();
  }

  return (
    <div className="mb-4 rounded-2xl border border-pitch-700 bg-pitch-900 p-5">
      <p className="font-display text-2xl uppercase">Welcome to Red Card 🟥</p>

      <p className="mt-3 text-sm font-semibold text-chalk">Here&apos;s how it works:</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        <li className="flex gap-2 text-sm text-chalk-dim">
          <span className="shrink-0 text-booking">•</span>
          Predict scores. Exact = 5 pts, right outcome = less.
        </li>
        <li className="flex gap-2 text-sm text-chalk-dim">
          <span className="shrink-0 text-booking">•</span>
          When a stage ends, the bottom of your table gets a forfeit.
        </li>
        <li className="flex gap-2 text-sm text-chalk-dim">
          <span className="shrink-0 text-booking">•</span>
          Group votes on which forfeit, no one escapes.
        </li>
      </ul>

      <p className="mt-3 text-xs text-chalk-dim">Tap the gear ⚙ anytime to see the full rules.</p>

      <button
        onClick={dismiss}
        disabled={busy}
        className="btn-primary mt-4 w-full disabled:opacity-50"
      >
        Got it →
      </button>
    </div>
  );
}

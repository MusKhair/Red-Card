"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type VoteOption = { id: string; title: string; description: string; tier: number };

const TIER_BADGE = ["", "text-grass", "text-booking", "text-sendoff"];

export function VoteSession({
  sessionId,
  options,
  isLoser,
  myVoteOptionId,
  castCount,
  eligibleCount,
}: {
  sessionId: string;
  options: VoteOption[];
  isLoser: boolean;
  myVoteOptionId: string | null;
  castCount: number;
  eligibleCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(myVoteOptionId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canVote = !isLoser && !myVoteOptionId;
  const pct = eligibleCount > 0 ? Math.round((castCount / eligibleCount) * 100) : 0;
  const lockedOption = options.find((o) => o.id === myVoteOptionId);

  async function lockVote() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    const res = await fetch("/api/forfeit/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, optionId: selected }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-pitch-800">
          <div className="h-full rounded-full bg-sendoff transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-chalk-dim">
          {castCount}/{eligibleCount} in
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {options.map((o) => {
          const mine = o.id === myVoteOptionId;
          const isSelected = o.id === selected;
          const highlighted = mine || isSelected;
          return (
            <div
              key={o.id}
              onClick={canVote && !busy ? () => setSelected(o.id) : undefined}
              className={`rounded-2xl p-5 text-left transition ${
                highlighted
                  ? "bg-gradient-to-b from-sendoff to-sendoff-deep text-pitch-950"
                  : "border border-pitch-700 bg-pitch-900 text-chalk"
              } ${canVote ? "cursor-pointer" : ""} ${canVote && !highlighted ? "hover:border-sendoff/50" : ""}`}
            >
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                  highlighted ? "text-pitch-950/70" : TIER_BADGE[o.tier]
                }`}
              >
                Tier {o.tier}
              </span>
              <p className="mt-1 font-display text-2xl uppercase leading-tight md:text-3xl">{o.title}</p>
              {!isLoser && (
                <p className={`mt-1 text-sm ${highlighted ? "text-pitch-950/70" : "text-chalk-dim"}`}>{o.description}</p>
              )}
              {mine && (
                <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-pitch-950/70">Your pick</p>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-center text-sm text-sendoff">{error}</p>}

      {canVote && (
        <button onClick={lockVote} disabled={!selected || busy} className="btn-danger w-full disabled:opacity-40">
          {busy ? "Locking…" : "Lock my vote"}
        </button>
      )}

      {myVoteOptionId && (
        <div className="rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3 text-center font-display uppercase tracking-wide text-chalk">
          Vote locked · {lockedOption?.title ?? ""}
        </div>
      )}

      {(myVoteOptionId || isLoser) && (
        <>
          <p className="text-center text-sm text-chalk-dim">
            {isLoser ? "Sit tight — the squad is deciding your fate." : "Waiting on the rest of the squad."}
          </p>
          <button onClick={() => router.refresh()} className="btn-ghost w-full">
            Refresh
          </button>
        </>
      )}
    </div>
  );
}

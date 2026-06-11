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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canVote = !isLoser && !myVoteOptionId;

  async function castVote(optionId: string) {
    setError(null);
    setBusy(optionId);
    const res = await fetch("/api/forfeit/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, optionId }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-center text-xs text-chalk-dim">
        {castCount} of {eligibleCount} voted
      </p>

      {options.map((o) => {
        const mine = o.id === myVoteOptionId;
        return (
          <div
            key={o.id}
            onClick={canVote && busy === null ? () => castVote(o.id) : undefined}
            className={`card text-left transition ${
              canVote ? `cursor-pointer hover:border-booking/60 ${busy !== null ? "opacity-50" : ""}` : ""
            } ${mine ? "border-booking" : ""}`}
          >
            <span className={`font-display text-sm uppercase ${TIER_BADGE[o.tier]}`}>Tier {o.tier}</span>
            <p className="mt-1 font-display text-2xl uppercase">{o.title}</p>
            {!isLoser && <p className="mt-1 text-sm text-chalk-dim">{o.description}</p>}
            {mine && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-booking">Your pick</p>}
          </div>
        );
      })}

      {error && <p className="text-sm text-sendoff">{error}</p>}

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

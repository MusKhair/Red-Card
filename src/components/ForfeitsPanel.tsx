"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type ForfeitRow = {
  id: string;
  stage: string;
  status: "assigned" | "vetoed" | "completed";
  created_at: string;
  user_id: string;
  profiles: { display_name: string } | null;
  forfeit_library: { title: string; tier: number; description: string } | null;
};

const TIER_BADGE = ["", "text-grass", "text-booking", "text-sendoff"];

export function ForfeitsPanel({
  groupId,
  isHost,
  currentUserId,
  vetoUsed,
  forfeits,
  stages,
}: {
  groupId: string;
  isHost: boolean;
  currentUserId: string;
  vetoUsed: boolean;
  forfeits: ForfeitRow[];
  stages: string[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState(stages[0] ?? "Groups");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: object, key: string) {
    setError(null);
    setBusy(key);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return null;
    }
    return json;
  }

  async function assign() {
    const json = await post("/api/forfeit/assign", { groupId, stage }, "assign");
    if (json?.forfeitId) router.push(`/g/${groupId}/forfeit/${json.forfeitId}`);
  }

  async function veto(forfeitId: string) {
    const json = await post("/api/forfeit/veto", { forfeitId }, forfeitId);
    if (json?.forfeitId) router.push(`/g/${groupId}/forfeit/${json.forfeitId}`);
  }

  async function complete(forfeitId: string) {
    const json = await post("/api/forfeit/complete", { forfeitId }, forfeitId);
    if (json) router.refresh();
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {isHost && (
        <div className="card border-booking/40">
          <p className="font-display text-xl uppercase">End of stage?</p>
          <p className="mt-1 text-xs text-chalk-dim">
            Assigns a random forfeit (up to your group&apos;s tier) to whoever&apos;s bottom of the table.
            Ties are settled by random draw.
          </p>
          <div className="mt-3 flex gap-2">
            <select className="input flex-1" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
              {stages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={assign} disabled={busy === "assign"} className="btn-danger px-4 text-sm disabled:opacity-50">
              {busy === "assign" ? "…" : "Show the card"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-sendoff">{error}</p>}

      {forfeits.length === 0 && (
        <div className="card text-center text-sm text-chalk-dim">
          No forfeits yet. The table decides who suffers first.
        </div>
      )}

      {forfeits.map((f) => (
        <div key={f.id} className={`card ${f.status === "vetoed" ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between">
            <p className="font-semibold">{f.profiles?.display_name ?? "?"}</p>
            <span className={`font-display text-sm uppercase ${TIER_BADGE[f.forfeit_library?.tier ?? 1]}`}>
              Tier {f.forfeit_library?.tier}
            </span>
          </div>
          <p className="mt-1 font-display text-2xl uppercase">{f.forfeit_library?.title}</p>
          <p className="mt-1 text-sm text-chalk-dim">{f.forfeit_library?.description}</p>
          <p className="mt-2 text-xs text-chalk-dim">
            {f.stage} ·{" "}
            {f.status === "completed" ? (
              <span className="text-grass">completed — proof in the group chat</span>
            ) : f.status === "vetoed" ? (
              "vetoed"
            ) : (
              "assigned"
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/g/${groupId}/forfeit/${f.id}`} className="btn-ghost px-4 py-2 text-xs">
              Reveal screen
            </Link>
            {f.status === "assigned" && f.user_id === currentUserId && !vetoUsed && (
              <button onClick={() => veto(f.id)} disabled={busy === f.id} className="btn-ghost px-4 py-2 text-xs disabled:opacity-50">
                Use my one veto
              </button>
            )}
            {f.status === "assigned" && isHost && (
              <button onClick={() => complete(f.id)} disabled={busy === f.id} className="btn-ghost px-4 py-2 text-xs disabled:opacity-50">
                Mark completed
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

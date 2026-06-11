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
  is_boss: boolean;
  vote_session_id: string | null;
  profiles: { display_name: string } | null;
  forfeit_library: { title: string; tier: number; description: string } | null;
  custom_forfeits: { title: string; tier: number; description: string } | null;
};

export type StageOption = { key: string; label: string };

const TIER_BADGE = ["", "text-grass", "text-booking", "text-sendoff"];

export function ForfeitsPanel({
  groupId,
  isHost,
  currentUserId,
  vetoUsed,
  forfeits,
  stages,
  fallbackStages,
  openVoteSessionId,
}: {
  groupId: string;
  isHost: boolean;
  currentUserId: string;
  vetoUsed: boolean;
  forfeits: ForfeitRow[];
  stages: StageOption[];
  fallbackStages: string[];
  openVoteSessionId: string | null;
}) {
  const router = useRouter();
  const availableStages = isHost ? stages : stages.filter((s) => fallbackStages.includes(s.key));
  const [stage, setStage] = useState(availableStages[0]?.key ?? stages[0]?.key ?? "GROUP_STAGE");
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

  async function openVote() {
    const json = await post("/api/forfeit/open-vote", { groupId, stage }, "open-vote");
    if (json?.sessionId) router.push(`/g/${groupId}/vote/${json.sessionId}`);
  }

  async function veto(forfeitId: string) {
    const json = await post("/api/forfeit/veto", { forfeitId }, forfeitId);
    if (json?.sessionId) router.push(`/g/${groupId}/vote/${json.sessionId}`);
    else if (json?.forfeitId) router.push(`/g/${groupId}/forfeit/${json.forfeitId}`);
  }

  async function complete(forfeitId: string) {
    const json = await post("/api/forfeit/complete", { forfeitId }, forfeitId);
    if (json) router.refresh();
  }

  const showOpenVoteCard = !openVoteSessionId && (isHost || availableStages.length > 0);

  return (
    <div className="mt-4 flex flex-col gap-3">
      {openVoteSessionId ? (
        <div className="card border-booking/40">
          <p className="font-display text-xl uppercase">Vote in progress</p>
          <p className="mt-1 text-xs text-chalk-dim">
            The squad&apos;s deciding the next forfeit. Cast your vote if you haven&apos;t already.
          </p>
          <Link href={`/g/${groupId}/vote/${openVoteSessionId}`} className="btn-primary mt-3 block w-full text-center">
            Go to the vote
          </Link>
        </div>
      ) : showOpenVoteCard ? (
        <div className="card border-booking/40">
          <p className="font-display text-xl uppercase">End of stage?</p>
          <p className="mt-1 text-xs text-chalk-dim">
            Opens a vote for whoever&apos;s bottom of the table — the squad picks their forfeit from 3 random options.
          </p>
          {!isHost && (
            <p className="mt-1 text-xs text-booking">The host&apos;s gone quiet, so you can open this one.</p>
          )}
          <div className="mt-3 flex gap-2">
            <select className="input flex-1" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
              {availableStages.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <button onClick={openVote} disabled={busy === "open-vote"} className="btn-danger px-4 text-sm disabled:opacity-50">
              {busy === "open-vote" ? "…" : "Open the vote"}
            </button>
          </div>
        </div>
      ) : null}

      {error && <p className="text-sm text-sendoff">{error}</p>}

      {forfeits.length === 0 && (
        <div className="card text-center text-sm text-chalk-dim">
          No forfeits yet. The table decides who suffers first.
        </div>
      )}

      {forfeits.map((f) => {
        const source = f.forfeit_library ?? f.custom_forfeits;
        return (
          <div key={f.id} className={`card ${f.status === "vetoed" ? "opacity-50" : ""} ${f.is_boss ? "border-booking/60" : ""}`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {f.is_boss && "👑 "}
                {f.profiles?.display_name ?? "?"}
              </p>
              <span className={`font-display text-sm uppercase ${TIER_BADGE[source?.tier ?? 1]}`}>
                Tier {source?.tier}
              </span>
            </div>
            <p className="mt-1 font-display text-2xl uppercase">{source?.title}</p>
            <p className="mt-1 text-sm text-chalk-dim">{source?.description}</p>
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
        );
      })}
    </div>
  );
}

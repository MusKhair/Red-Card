"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PROOF_OPTIONS } from "@/lib/forfeits";

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

export type CustomForfeitRow = {
  id: string;
  title: string;
  description: string;
  tier: number;
  proof: string;
  status: "pending_approval" | "approved";
  proposerName: string;
  isProposer: boolean;
  yesCount: number;
  noCount: number;
  myVote: boolean | null;
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
  customForfeits,
  memberCount,
  maxTier,
}: {
  groupId: string;
  isHost: boolean;
  currentUserId: string;
  vetoUsed: boolean;
  forfeits: ForfeitRow[];
  stages: StageOption[];
  fallbackStages: string[];
  openVoteSessionId: string | null;
  customForfeits: CustomForfeitRow[];
  memberCount: number;
  maxTier: number;
}) {
  const router = useRouter();
  const availableStages = isHost ? stages : stages.filter((s) => fallbackStages.includes(s.key));
  const [stage, setStage] = useState(availableStages[0]?.key ?? stages[0]?.key ?? "GROUP_STAGE");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPropose, setShowPropose] = useState(false);
  const [showApproved, setShowApproved] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposeTier, setProposeTier] = useState(1);
  const [proof, setProof] = useState<string>(PROOF_OPTIONS[0]);

  async function request(method: string, url: string, body: object | null, key: string) {
    setError(null);
    setBusy(key);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return null;
    }
    return json;
  }

  async function post(url: string, body: object, key: string) {
    return request("POST", url, body, key);
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

  async function propose() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    const json = await post("/api/customs/propose", { groupId, title, description, tier: proposeTier, proof }, "propose");
    if (json) {
      setTitle("");
      setDescription("");
      setProposeTier(1);
      setProof(PROOF_OPTIONS[0]);
      setShowPropose(false);
      router.refresh();
    }
  }

  async function castVote(customId: string, vote: boolean) {
    const json = await post(`/api/customs/${customId}/vote`, { vote }, `vote-${customId}`);
    if (json) router.refresh();
  }

  async function deleteCustom(customId: string) {
    const json = await request("DELETE", `/api/customs/${customId}`, null, `delete-${customId}`);
    if (json) router.refresh();
  }

  async function rejectCustom(customId: string) {
    const json = await request("PATCH", `/api/customs/${customId}/reject`, null, `reject-${customId}`);
    if (json) router.refresh();
  }

  const showOpenVoteCard = !openVoteSessionId && (isHost || availableStages.length > 0);
  const pendingCustoms = customForfeits.filter((c) => c.status === "pending_approval");
  const approvedCustoms = customForfeits.filter((c) => c.status === "approved");
  const threshold = Math.floor(memberCount / 2);

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

      {forfeits.length === 0 && customForfeits.length === 0 && !openVoteSessionId && (
        <div className="card py-6 text-center">
          <p className="eyebrow">No verdicts yet</p>
          <p className="mt-2 text-sm text-chalk-dim">
            When a stage ends, the bottom of the table gets the sentence.
          </p>
        </div>
      )}

      <div className="card">
        {!showPropose ? (
          <button onClick={() => setShowPropose(true)} className="btn-ghost w-full">
            + Propose a custom forfeit
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-display text-xl uppercase">Propose a forfeit</p>

            <div>
              <label className="eyebrow">Title</label>
              <input
                className="input mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                placeholder="e.g. Sing the national anthem — backwards"
              />
            </div>

            <div>
              <label className="eyebrow">Description</label>
              <textarea
                className="input mt-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="What exactly do they have to do?"
              />
            </div>

            <div>
              <label className="eyebrow">Tier</label>
              <div className="mt-1 flex gap-2">
                {[1, 2, 3].filter((t) => t <= maxTier).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setProposeTier(t)}
                    className={`flex-1 rounded-xl border px-3 py-2 font-display text-sm uppercase transition active:scale-95 ${
                      proposeTier === t ? `border-booking ${TIER_BADGE[t]}` : "border-pitch-700 text-chalk-dim"
                    }`}
                  >
                    Tier {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="eyebrow">Proof</label>
              <div className="mt-1 flex flex-col gap-1.5">
                {PROOF_OPTIONS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-chalk-dim">
                    <input type="radio" name="proof" checked={proof === p} onChange={() => setProof(p)} />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowPropose(false)} className="btn-ghost flex-1">
                Cancel
              </button>
              <button onClick={propose} disabled={busy === "propose"} className="btn-primary flex-1 disabled:opacity-50">
                {busy === "propose" ? "…" : "Propose"}
              </button>
            </div>
          </div>
        )}
      </div>

      {pendingCustoms.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Pending approval</p>
          {pendingCustoms.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-xl uppercase">{c.title}</p>
                <span className={`font-display text-sm uppercase ${TIER_BADGE[c.tier]}`}>Tier {c.tier}</span>
              </div>
              <p className="mt-1 text-sm text-chalk-dim">{c.description}</p>
              <p className="mt-2 text-xs text-chalk-dim">
                Proposed by {c.proposerName} · Proof: {c.proof}
              </p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
                {c.yesCount} yes / {c.noCount} no · need over {threshold} to approve
              </p>
              {c.myVote !== null && (
                <p className="mt-1 text-xs text-grass">You voted: {c.myVote ? "Yes" : "No"}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => castVote(c.id, true)}
                  disabled={busy === `vote-${c.id}`}
                  className={`btn-ghost px-4 py-2 text-xs disabled:opacity-50 ${c.myVote === true ? "border-grass text-grass" : ""}`}
                >
                  Approve
                </button>
                <button
                  onClick={() => castVote(c.id, false)}
                  disabled={busy === `vote-${c.id}`}
                  className={`btn-ghost px-4 py-2 text-xs disabled:opacity-50 ${c.myVote === false ? "border-sendoff text-sendoff" : ""}`}
                >
                  Reject
                </button>
                {(c.isProposer || isHost) && (
                  <button
                    onClick={() => deleteCustom(c.id)}
                    disabled={busy === `delete-${c.id}`}
                    className="btn-ghost px-4 py-2 text-xs disabled:opacity-50"
                  >
                    Delete proposal
                  </button>
                )}
                {isHost && (
                  <button
                    onClick={() => rejectCustom(c.id)}
                    disabled={busy === `reject-${c.id}`}
                    className="px-4 py-2 text-xs text-sendoff underline underline-offset-2 disabled:opacity-50"
                  >
                    Reject (host)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {approvedCustoms.length > 0 && (
        <div className="card">
          <button onClick={() => setShowApproved((s) => !s)} className="flex w-full items-center justify-between">
            <p className="eyebrow">Approved customs ({approvedCustoms.length})</p>
            <span className="text-chalk-dim">{showApproved ? "−" : "+"}</span>
          </button>
          {showApproved && (
            <div className="mt-3 flex flex-col gap-3">
              {approvedCustoms.map((c) => (
                <div key={c.id} className="border-t border-pitch-800 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-lg uppercase">{c.title}</p>
                    <span className={`font-display text-xs uppercase ${TIER_BADGE[c.tier]}`}>Tier {c.tier}</span>
                  </div>
                  <p className="mt-1 text-sm text-chalk-dim">{c.description}</p>
                  <p className="mt-1 text-xs text-chalk-dim">
                    Proposed by {c.proposerName} · Proof: {c.proof}
                  </p>
                </div>
              ))}
            </div>
          )}
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

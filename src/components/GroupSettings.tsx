"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type GroupMember = { user_id: string; display_name: string };

export function GroupSettings({
  groupId,
  groupName,
  isHost,
  currentUserId,
  members,
  onLeaveOrDelete,
  onMemberRemoved,
}: {
  groupId: string;
  groupName: string;
  isHost: boolean;
  currentUserId: string;
  members: GroupMember[];
  onLeaveOrDelete?: () => void;
  onMemberRemoved?: () => void;
}) {
  const router = useRouter();
  const [leaveConfirming, setLeaveConfirming] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/leave`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(json.error ?? "Something went wrong.");
      return;
    }
    onLeaveOrDelete?.();
    router.push("/groups");
  }

  async function deleteGroup() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(json.error ?? "Something went wrong.");
      return;
    }
    onLeaveOrDelete?.();
    router.push("/groups");
  }

  async function kick(userId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }
    setKickingUserId(null);
    onMemberRemoved?.();
    router.refresh();
  }

  const nameMatches = deleteInput.trim().toLowerCase() === groupName.trim().toLowerCase();
  const otherMembers = members.filter((m) => m.user_id !== currentUserId);

  return (
    <div className="flex flex-col gap-4">
      {isHost ? (
        <div className="card">
          <p className="font-display text-2xl font-bold uppercase tracking-wide">Members</p>
          {otherMembers.length === 0 ? (
            <p className="mt-2 text-sm text-chalk-dim">No other members yet — share the invite.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {otherMembers.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 border-b border-pitch-800 pb-2 last:border-0 last:pb-0"
                >
                  <p className="font-display uppercase tracking-wide">{m.display_name}</p>
                  {kickingUserId === m.user_id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-chalk-dim">Remove?</span>
                      <button
                        onClick={() => kick(m.user_id)}
                        disabled={busy}
                        className="rounded-full bg-sendoff px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk disabled:opacity-50"
                      >
                        {busy ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setKickingUserId(null)}
                        className="rounded-full border border-pitch-700 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk-dim"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setKickingUserId(m.user_id)}
                      className="rounded-full border border-sendoff/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-sendoff"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {kickingUserId && (
            <p className="mt-2 text-xs text-chalk-dim">
              Remove {otherMembers.find((m) => m.user_id === kickingUserId)?.display_name} from {groupName}?
            </p>
          )}
        </div>
      ) : (
        <div className="card">
          <p className="font-display text-2xl font-bold uppercase tracking-wide">Leave group</p>
          {!leaveConfirming ? (
            <button onClick={() => setLeaveConfirming(true)} className="btn-ghost mt-3 w-full">
              Leave group
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-chalk-dim">
                Leave {groupName}? Your predictions stay for historical scoring but you&apos;ll be removed from the
                leaderboard.
              </p>
              <div className="flex gap-2">
                <button onClick={leave} disabled={busy} className="btn-danger flex-1 disabled:opacity-50">
                  {busy ? "Leaving…" : "Yes, leave"}
                </button>
                <button onClick={() => setLeaveConfirming(false)} className="btn-ghost flex-1">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isHost && (
        <div className="card border border-sendoff/40">
          <p className="font-display text-2xl font-bold uppercase tracking-wide text-sendoff">Delete group</p>
          <p className="mt-2 text-sm text-chalk-dim">
            You&apos;re the host — to leave, delete the group. This permanently removes {groupName}, its forfeits,
            votes, and leaderboard for everyone. Predictions stay with each player for their other groups.
          </p>
          {!deleteConfirming ? (
            <button onClick={() => setDeleteConfirming(true)} className="btn-danger mt-3 w-full">
              Delete group
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
                Type &quot;{groupName}&quot; to confirm
              </label>
              <input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} className="input" autoFocus />
              <div className="flex gap-2">
                <button onClick={deleteGroup} disabled={!nameMatches || busy} className="btn-danger flex-1 disabled:opacity-40">
                  {busy ? "Deleting…" : "Delete forever"}
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirming(false);
                    setDeleteInput("");
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-center text-sm text-sendoff">{error}</p>}
    </div>
  );
}

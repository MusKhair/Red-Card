"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GroupSettings, type GroupMember } from "@/components/GroupSettings";
import { TermsContent } from "@/components/TermsContent";

const GROUP_ID_RE = /^\/g\/([^/]+)/;

type GroupSettingsData = {
  groupName: string;
  isHost: boolean;
  currentUserId: string;
  members: GroupMember[];
};

export function SettingsDrawer({
  open,
  onClose,
  isSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  isSignedIn: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groupId = pathname.match(GROUP_ID_RE)?.[1] ?? null;

  const [data, setData] = useState<GroupSettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [view, setView] = useState<"menu" | "terms">("menu");

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setView("menu");
      setEditing(false);
      setNameError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isSignedIn) return;
    fetch("/api/profile/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (json) setDisplayName(json.displayName); });
  }, [open, isSignedIn]);

  useEffect(() => {
    if (!open || !groupId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/groups/${groupId}/settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, groupId, reloadToken]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function saveName() {
    setNameError(null);
    const trimmed = nameInput.trim();
    if (!trimmed) return setNameError("Name can't be empty.");
    if (trimmed.length > 30) return setNameError("Name must be 30 characters or less.");
    setNameSaving(true);
    const res = await fetch("/api/profile/display-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: trimmed }),
    });
    const json = await res.json();
    setNameSaving(false);
    if (!res.ok) { setNameError(json.error ?? "Something went wrong."); return; }
    setDisplayName(json.displayName);
    setEditing(false);
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
    router.refresh();
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-pitch-800 bg-pitch-950 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-pitch-800 px-5 py-4">
          <p className="font-display text-2xl font-bold uppercase tracking-wide">Menu</p>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-pitch-700 text-chalk-dim"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {view === "terms" ? (
            <div>
              <button onClick={() => setView("menu")} className="text-xs uppercase tracking-wide text-chalk-dim">
                ← Back
              </button>
              <div className="mt-4">
                <TermsContent />
              </div>
            </div>
          ) : (
            <>
          {isSignedIn && (
            <section className="mb-6">
              <p className="eyebrow">Your profile</p>
              <div className="mt-3">
                {editing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className="input"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={30}
                      placeholder="Display name"
                      autoFocus
                    />
                    {nameError && <p className="text-xs text-sendoff">{nameError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={saveName}
                        disabled={nameSaving}
                        className="btn-primary flex-1 py-1.5 text-sm disabled:opacity-50"
                      >
                        {nameSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditing(false); setNameError(null); }}
                        className="btn-ghost flex-1 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-chalk">{displayName ?? "—"}</p>
                    <button
                      onClick={() => { setNameInput(displayName ?? ""); setEditing(true); }}
                      className="text-xs uppercase tracking-wide text-booking"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {groupId && (
            <section className="mb-6">
              <p className="eyebrow">This group</p>
              {loading && !data && <p className="mt-3 text-sm text-chalk-dim">Loading…</p>}
              {data && (
                <div className="mt-3">
                  <GroupSettings
                    groupId={groupId}
                    groupName={data.groupName}
                    isHost={data.isHost}
                    currentUserId={data.currentUserId}
                    members={data.members}
                    onLeaveOrDelete={onClose}
                    onMemberRemoved={() => setReloadToken((t) => t + 1)}
                  />
                </div>
              )}
            </section>
          )}

          <section>
            <p className="eyebrow">How to play</p>

            <div className="mt-3 flex flex-col gap-5 text-sm leading-relaxed text-chalk-dim">
              <div>
                <h3 className="font-display text-lg uppercase tracking-wide text-chalk">Predict every match</h3>
                <p className="mt-1">
                  For each match, predict the final score before kickoff. Once it kicks off, your pick is locked.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg uppercase tracking-wide text-chalk">Points</h3>
                <ul className="mt-1 flex flex-col gap-1">
                  <li><strong className="text-chalk">+5</strong> — exact score (e.g. you said 2-1, actual was 2-1; or you said 1-1, actual was 1-1)</li>
                  <li><strong className="text-chalk">+3</strong> — correct goal difference (e.g. you said 3-2, actual was 2-1; or you said 1-1, actual was 2-2 — both draws, same goal difference)</li>
                  <li><strong className="text-chalk">+1</strong> — correct winner only (e.g. you said 1-0 home win, actual was 3-1 home win)</li>
                  <li><strong className="text-chalk">0</strong> — wrong outcome</li>
                </ul>
                <p className="mt-2">
                  Draws are scored the same way as any other prediction — predict a draw, get the exact score = +5,
                  or get any draw correctly = +3.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg uppercase tracking-wide text-chalk">Tournament bets (bonus picks, lock July 2)</h3>
                <ul className="mt-1 flex flex-col gap-1">
                  <li><strong className="text-chalk">Tournament Winner</strong>: pick the team you think wins it all. +15 pts if right.</li>
                  <li><strong className="text-chalk">Golden Boot</strong>: pick the top scorer of the tournament. +10 pts if right.</li>
                  <li><strong className="text-chalk">Golden Ball</strong>: pick the best player of the tournament. +5 pts if right.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-display text-lg uppercase tracking-wide text-chalk">Who gets the red card</h3>
                <p className="mt-1">
                  At the end of each stage (Group, R32, R16, QF, SF, Final), whoever&apos;s at the bottom of the
                  leaderboard gets a forfeit. Group stage = friendly, knockouts = challenging, Semi/Final = extreme.
                </p>
                <p className="mt-2">
                  The Final loser gets the <strong className="text-chalk">BOSS FORFEIT</strong> — the worst one.
                </p>
              </div>

              <div>
                <h3 className="font-display text-lg uppercase tracking-wide text-chalk">How the forfeit is picked</h3>
                <ol className="mt-1 flex list-decimal flex-col gap-1 pl-4">
                  <li>The host opens the vote (or any member can if the host&apos;s MIA for 48h)</li>
                  <li>3 random forfeits from the right tier appear</li>
                  <li>The squad votes (the loser can&apos;t vote on their own forfeit)</li>
                  <li>Highest votes wins (random tiebreaker)</li>
                </ol>
              </div>

              <div>
                <h3 className="font-display text-lg uppercase tracking-wide text-chalk">Veto</h3>
                <p className="mt-1">You get ONE veto per tournament. Use it to reject your forfeit and trigger a re-vote.</p>
              </div>

              <div>
                <h3 className="font-display text-lg uppercase tracking-wide text-chalk">Proof</h3>
                <p className="mt-1">
                  Once you&apos;ve done your forfeit, post proof (photo, video, or screenshot) to the group chat. Host
                  marks it complete.
                </p>
              </div>
            </div>
          </section>

          <button
            onClick={() => setView("terms")}
            className="mt-6 text-xs uppercase tracking-wide text-chalk-dim underline underline-offset-2"
          >
            Terms &amp; Conditions
          </button>

          {isSignedIn && (
            <button onClick={signOut} className="btn-ghost mt-6 w-full">
              Sign out
            </button>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

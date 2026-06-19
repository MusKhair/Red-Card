"use client";

import { useEffect, useState } from "react";

export type BoardRow = {
  group_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  exact_hits: number;
};

export function Leaderboard({
  board,
  currentUserId,
  groupCode,
}: {
  board: BoardRow[];
  currentUserId: string;
  groupCode?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState(groupCode ? `/join/${groupCode}` : "");

  useEffect(() => {
    if (groupCode) setInviteUrl(`${window.location.origin}/join/${groupCode}`);
  }, [groupCode]);

  if (!board.length) {
    return <div className="card text-center text-sm text-chalk-dim">Nobody here yet. Share the invite.</div>;
  }

  if (board.length === 1 && board[0].user_id === currentUserId && groupCode) {
    function copy() {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="eyebrow">Your table is empty</p>
          <h2 className="mt-1 font-display text-4xl font-bold uppercase leading-none md:text-5xl">Invite your squad</h2>
        </div>
        <div className="card">
          <p className="text-sm text-chalk-dim">Invite your friends to start the sweepstakes.</p>
          <button onClick={copy} className="btn-primary mt-4 w-full">
            {copied ? "Copied ✓" : "Copy invite link"}
          </button>
          <div className="mt-4">
            <p className="text-xs text-chalk-dim">Share manually:</p>
            <p className="mt-1 break-all font-mono text-xs text-chalk">{inviteUrl}</p>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
            Currently in: 1 player (just you)
          </p>
        </div>
      </div>
    );
  }
  const last = board.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Standings</p>
        <h2 className="mt-1 font-display text-4xl font-bold uppercase leading-none md:text-5xl">The table</h2>
      </div>

      <div className="flex flex-col gap-2">
        {board.map((row, i) => {
          const isLeader = i === 0 && board.length > 1;
          const danger = i === last && board.length > 1;
          const isMe = row.user_id === currentUserId;

          return (
            <div key={row.user_id} className="contents">
              {danger && (
                <div className="my-1 flex items-center gap-3">
                  <span className="h-px flex-1 border-t border-dashed border-sendoff/40" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-sendoff">Red card zone</span>
                  <span className="h-px flex-1 border-t border-dashed border-sendoff/40" />
                </div>
              )}
              <div
                className={`card flex items-center gap-3 md:p-5 ${
                  isLeader ? "ring-1 ring-grass-bright/60 bg-grass-bright/5" : ""
                } ${danger ? "ring-1 ring-sendoff/60 bg-sendoff/5" : ""} ${
                  isMe && !isLeader && !danger ? "bg-pitch-800" : ""
                }`}
              >
                <span
                  className={`w-7 font-display text-2xl md:text-3xl ${
                    i === 0 ? "text-booking" : danger ? "text-sendoff" : "text-chalk-dim"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base uppercase tracking-wide md:text-lg">
                    {row.display_name}
                    {isMe && <span className="text-chalk-dim"> (you)</span>}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
                    {row.exact_hits} exact score{row.exact_hits === 1 ? "" : "s"}
                  </p>
                </div>
                {danger ? (
                  <span className="rounded-full bg-sendoff px-3 py-1 font-display text-lg tabular-nums text-chalk md:text-xl">
                    {row.points}
                  </span>
                ) : (
                  <span className="font-display text-2xl tabular-nums md:text-3xl">{row.points}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
        Exact score 5 · winner + goal diff 3 · winner 1 — 90-minute result
      </p>
    </div>
  );
}

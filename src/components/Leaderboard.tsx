"use client";

export type BoardRow = {
  group_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  exact_hits: number;
};

export function Leaderboard({ board, currentUserId }: { board: BoardRow[]; currentUserId: string }) {
  if (!board.length) {
    return <div className="card mt-4 text-center text-sm text-chalk-dim">Nobody here yet. Share the invite.</div>;
  }
  const last = board.length - 1;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {board.map((row, i) => {
        const danger = i === last && board.length > 1;
        return (
          <div
            key={row.user_id}
            className={`card flex items-center gap-3 ${danger ? "border-sendoff/60" : ""} ${
              row.user_id === currentUserId ? "bg-pitch-800" : ""
            }`}
          >
            <span className={`w-7 font-display text-2xl ${i === 0 ? "text-booking" : danger ? "text-sendoff" : "text-chalk-dim"}`}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {row.display_name}
                {row.user_id === currentUserId && <span className="text-chalk-dim"> (you)</span>}
              </p>
              <p className="text-xs text-chalk-dim">{row.exact_hits} exact scores</p>
            </div>
            <span className="font-display text-2xl tabular-nums">{row.points}</span>
            {danger && <span className="font-display text-xs uppercase text-sendoff">forfeit zone</span>}
          </div>
        );
      })}
      <p className="mt-1 text-center text-xs text-chalk-dim">
        Exact score 5 · winner + goal diff 3 · winner 1. 90-minute result.
      </p>
    </div>
  );
}

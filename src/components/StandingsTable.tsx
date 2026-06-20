import Image from "next/image";

export type StandingRow = {
  group_letter: string;
  team_name: string;
  team_crest: string | null;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

export function StandingsTable({ standings }: { standings: StandingRow[] }) {
  if (standings.length === 0) {
    return (
      <div className="card py-8 text-center">
        <p className="eyebrow">No standings yet</p>
        <p className="mt-2 text-sm text-chalk-dim">
          Standings will appear here once group stage matches start.
        </p>
      </div>
    );
  }

  // Group rows by group_letter; order is guaranteed by the view (A→L)
  const groups = new Map<string, StandingRow[]>();
  for (const row of standings) {
    const bucket = groups.get(row.group_letter) ?? [];
    bucket.push(row);
    groups.set(row.group_letter, bucket);
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedGroups.map(([letter, rows]) => (
        <div key={letter} className="card overflow-hidden p-0">
          <div className="border-b border-pitch-800 px-4 py-2.5">
            <p className="eyebrow">Group {letter}</p>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pitch-800 text-chalk-dim">
                <th className="w-6 py-2 pl-4 text-left font-mono tracking-[0.12em]">#</th>
                <th className="py-2 text-left font-mono tracking-[0.12em]">Team</th>
                <th className="py-2 pr-2 text-right font-mono tracking-[0.12em]">MP</th>
                <th className="py-2 pr-2 text-right font-mono tracking-[0.12em]">W</th>
                <th className="py-2 pr-2 text-right font-mono tracking-[0.12em]">D</th>
                <th className="py-2 pr-2 text-right font-mono tracking-[0.12em]">L</th>
                <th className="hidden py-2 pr-2 text-right font-mono tracking-[0.12em] sm:table-cell">GF</th>
                <th className="hidden py-2 pr-2 text-right font-mono tracking-[0.12em] sm:table-cell">GA</th>
                <th className="py-2 pr-2 text-right font-mono tracking-[0.12em]">GD</th>
                <th className="py-2 pr-4 text-right font-mono font-bold tracking-[0.12em]">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rank = i + 1;
                // WC 2026: top 2 qualify, 3rd is "in contention" (best 8 of 12 advance)
                const rowClass =
                  rank <= 2
                    ? "border-l-[3px] border-grass bg-grass-bright/5"
                    : rank === 3
                    ? "border-l-[3px] border-booking bg-booking/5"
                    : "opacity-50";

                return (
                  <tr
                    key={row.team_name}
                    className={`border-b border-pitch-800 last:border-0 ${rowClass}`}
                  >
                    <td
                      className={`py-2 pl-3.5 font-display text-sm ${
                        rank <= 2 ? "text-grass" : rank === 3 ? "text-booking" : "text-chalk-dim"
                      }`}
                    >
                      {rank}
                    </td>
                    <td className="py-2 pr-1">
                      <div className="flex items-center gap-1.5">
                        {row.team_crest ? (
                          <Image
                            src={row.team_crest}
                            alt=""
                            width={16}
                            height={16}
                            className="shrink-0 object-contain"
                          />
                        ) : (
                          <span className="inline-block h-4 w-4 shrink-0 rounded-sm bg-pitch-700" />
                        )}
                        <span className="max-w-[90px] truncate font-display text-[11px] uppercase tracking-wide">
                          {row.team_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-chalk-dim">{row.matches_played}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-chalk-dim">{row.wins}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-chalk-dim">{row.draws}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-chalk-dim">{row.losses}</td>
                    <td className="hidden py-2 pr-2 text-right tabular-nums text-chalk-dim sm:table-cell">
                      {row.goals_for}
                    </td>
                    <td className="hidden py-2 pr-2 text-right tabular-nums text-chalk-dim sm:table-cell">
                      {row.goals_against}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-chalk-dim">
                      {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                    </td>
                    <td className="py-2 pr-4 text-right font-bold tabular-nums">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legend — only show on first card to avoid repetition */}
          {letter === sortedGroups[0][0] && (
            <div className="flex gap-3 border-t border-pitch-800 px-4 py-2">
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.15em] text-grass">
                <span className="inline-block h-2 w-0.5 rounded-full bg-grass" /> Qualified
              </span>
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.15em] text-booking">
                <span className="inline-block h-2 w-0.5 rounded-full bg-booking" /> In contention
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

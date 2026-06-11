"use client";

import Link from "next/link";
import { STAGE_LABEL } from "@/lib/stages";
import { TOURNAMENT_PREDICTIONS_LOCK } from "@/lib/tournament";
import type { Match, MyPrediction } from "@/components/MatchCard";
import type { BoardRow } from "@/components/Leaderboard";

export type TournamentPrediction = {
  winner_team: string | null;
  golden_boot_player: string | null;
  winner_points: number | null;
  golden_boot_points: number | null;
} | null;

export type TournamentResolutions = {
  tournamentWinner: string | null;
  goldenBootWinner: string | null;
};

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function fmtKickoffIn(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Kicks off in ${days}d ${hours}h`;
  if (hours > 0) return `Kicks off in ${hours}h ${minutes}m`;
  return `Kicks off in ${minutes}m`;
}

/** +15/+10 style badge for resolved tournament awards. */
function AwardPointsBadge({ points }: { points: number | null }) {
  if (points === null) return null;
  return (
    <span className={points > 0 ? "ml-2 font-semibold text-grass" : "ml-2 text-sendoff"}>
      {points > 0 ? `+${points} pts` : "0 pts"}
    </span>
  );
}

/** +5/+3/+1/0/Pending badge for a single match prediction. */
function PredictionPointsBadge({ points }: { points: number | null }) {
  if (points === null) return <span className="text-xs italic text-chalk-dim">Pending</span>;
  if (points === 5) return <span className="text-xs font-semibold text-grass">+5 pts</span>;
  if (points > 0) return <span className="text-xs font-semibold text-booking">+{points} pt{points > 1 ? "s" : ""}</span>;
  return <span className="text-xs text-chalk-dim">0 pts</span>;
}

export function BetsPanel({
  currentUserId,
  matches,
  myPredictions,
  tournamentPrediction,
  tournamentResolutions,
  board,
  leaderboardPosition,
}: {
  currentUserId: string;
  matches: Match[];
  myPredictions: MyPrediction[];
  tournamentPrediction: TournamentPrediction;
  tournamentResolutions: TournamentResolutions;
  board: BoardRow[];
  leaderboardPosition: number | null;
}) {
  const locked = Date.now() > new Date(TOURNAMENT_PREDICTIONS_LOCK).getTime();
  const now = Date.now();

  const matchesById = new Map(matches.map((m) => [m.id, m]));
  const rows = myPredictions
    .map((p) => ({ prediction: p, match: matchesById.get(p.match_id) }))
    .filter((r): r is { prediction: MyPrediction; match: Match } => !!r.match);

  // 0 = live (kicked off, not yet finished), 1 = upcoming, 2 = finished.
  const bucketOf = (m: Match): 0 | 1 | 2 => {
    if (m.status === "FINISHED") return 2;
    return new Date(m.kickoff).getTime() > now ? 1 : 0;
  };

  rows.sort((a, b) => {
    const ba = bucketOf(a.match);
    const bb = bucketOf(b.match);
    if (ba !== bb) return ba - bb;
    const ka = new Date(a.match.kickoff).getTime();
    const kb = new Date(b.match.kickoff).getTime();
    return ba === 2 ? kb - ka : ka - kb;
  });

  const myRow = board.find((r) => r.user_id === currentUserId);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="card">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl uppercase">Tournament bets</p>
          {locked ? (
            <span className="text-xs uppercase text-chalk-dim">Locked</span>
          ) : (
            <Link href="/predictions" className="text-xs uppercase text-booking">
              Edit before June 14
            </Link>
          )}
        </div>

        {!tournamentPrediction ? (
          <Link href="/predictions" className="mt-3 block text-sm text-booking">
            You haven&apos;t made tournament picks yet — make them now →
          </Link>
        ) : (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <p>
              🏆 Winner: <span className="font-semibold">{tournamentPrediction.winner_team ?? "—"}</span>
              <AwardPointsBadge points={tournamentPrediction.winner_points} />
              {tournamentResolutions.tournamentWinner && (
                <span className="ml-2 text-xs text-chalk-dim">(Result: {tournamentResolutions.tournamentWinner})</span>
              )}
            </p>
            <p>
              ⚽ Golden Boot: <span className="font-semibold">{tournamentPrediction.golden_boot_player ?? "—"}</span>
              <AwardPointsBadge points={tournamentPrediction.golden_boot_points} />
              {tournamentResolutions.goldenBootWinner && (
                <span className="ml-2 text-xs text-chalk-dim">(Result: {tournamentResolutions.goldenBootWinner})</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <p className="font-display text-xl uppercase">Match predictions</p>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-dim">
            You haven&apos;t predicted any matches yet — head to Fixtures to make some.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {rows.map(({ prediction, match }) => {
              const kickoffLocal = new Date(match.kickoff).toLocaleString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });

              let actualLine: string;
              if (match.status === "FINISHED") {
                actualLine = `Final: ${match.home_score ?? "–"}-${match.away_score ?? "–"}`;
              } else {
                const msUntilKickoff = new Date(match.kickoff).getTime() - now;
                actualLine = msUntilKickoff > 0 ? fmtKickoffIn(msUntilKickoff) : `Live: ${match.home_score ?? "–"}-${match.away_score ?? "–"}`;
              }

              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between gap-3 border-b border-pitch-800 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-chalk-dim">
                      {STAGE_LABEL[match.stage] ?? match.stage} · {kickoffLocal}
                    </p>
                    <p className="truncate text-sm font-semibold">
                      {match.home_team} vs {match.away_team}
                    </p>
                    <p className="mt-0.5 text-xs text-chalk-dim">
                      You said {prediction.pred_home}-{prediction.pred_away} · {actualLine}
                    </p>
                  </div>
                  <PredictionPointsBadge points={prediction.points} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <p className="font-display text-xl uppercase">Your standing</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-chalk-dim">Total points</p>
            <p className="font-display text-2xl tabular-nums">{myRow?.points ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-chalk-dim">Exact scores</p>
            <p className="font-display text-2xl tabular-nums">{myRow?.exact_hits ?? 0}</p>
          </div>
        </div>
        {leaderboardPosition !== null && board.length > 0 && (
          <p className="mt-2 text-sm text-chalk-dim">
            Position: <span className="font-semibold text-chalk">{ordinal(leaderboardPosition)} of {board.length}</span>
          </p>
        )}
        {tournamentPrediction && (tournamentPrediction.winner_points !== null || tournamentPrediction.golden_boot_points !== null) && (
          <p className="mt-2 text-xs text-chalk-dim">
            Tournament awards: {tournamentPrediction.winner_points ?? 0} + {tournamentPrediction.golden_boot_points ?? 0} pts
          </p>
        )}
      </div>
    </div>
  );
}

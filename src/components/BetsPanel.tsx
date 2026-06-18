"use client";

import { useState } from "react";
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

const LIVE_STATUSES = new Set(["LIVE", "IN_PLAY", "PAUSED"]);

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

/** +15/+10 style pill for resolved tournament awards. */
function AwardPointsBadge({ points }: { points: number | null }) {
  if (points === null) return null;
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] ${
        points > 0 ? "bg-grass-bright text-pitch-950" : "bg-pitch-800 text-chalk-dim"
      }`}
    >
      {points > 0 ? `+${points} pts` : "0 pts"}
    </span>
  );
}

/** +5/+3/+1/0/Pending pill for a single match prediction. */
function PredictionPointsBadge({ points }: { points: number | null }) {
  if (points === null) {
    return (
      <span className="rounded-full bg-pitch-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk-dim">
        Pending
      </span>
    );
  }
  if (points === 5) {
    return (
      <span className="rounded-full bg-grass-bright px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-pitch-950">
        +5 pts
      </span>
    );
  }
  if (points > 0) {
    return (
      <span className="rounded-full bg-booking px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-pitch-950">
        +{points} pt{points > 1 ? "s" : ""}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-pitch-800 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk-dim">
      0 pts
    </span>
  );
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
  const [matchSubTab, setMatchSubTab] = useState<"upcoming" | "past">("upcoming");

  const locked = Date.now() > new Date(TOURNAMENT_PREDICTIONS_LOCK).getTime();
  const now = Date.now();

  const matchesById = new Map(matches.map((m) => [m.id, m]));
  const allRows = myPredictions
    .map((p) => ({ prediction: p, match: matchesById.get(p.match_id) }))
    .filter((r): r is { prediction: MyPrediction; match: Match } => !!r.match);

  const upcomingRows = allRows
    .filter(({ match }) => match.status !== "FINISHED")
    .sort((a, b) => {
      const aLive = LIVE_STATUSES.has(a.match.status) ? 0 : 1;
      const bLive = LIVE_STATUSES.has(b.match.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return new Date(a.match.kickoff).getTime() - new Date(b.match.kickoff).getTime();
    });

  const pastRows = allRows
    .filter(({ match }) => match.status === "FINISHED")
    .sort((a, b) => new Date(b.match.kickoff).getTime() - new Date(a.match.kickoff).getTime());

  const visibleRows = matchSubTab === "upcoming" ? upcomingRows : pastRows;

  const myRow = board.find((r) => r.user_id === currentUserId);

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-4">
      <div className="card md:col-span-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl font-bold uppercase tracking-wide">Tournament bets</p>
          {locked ? (
            <span className="rounded-full bg-pitch-800 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
              Locked
            </span>
          ) : (
            <Link
              href="/predictions"
              className="rounded-full border border-booking/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-booking"
            >
              Edit before June 20
            </Link>
          )}
        </div>

        {!tournamentPrediction ? (
          <Link href="/predictions" className="mt-3 block text-sm text-booking">
            You haven&apos;t made tournament picks yet — make them now →
          </Link>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <p className="text-sm">
              🏆 Winner: <span className="font-display uppercase tracking-wide">{tournamentPrediction.winner_team ?? "—"}</span>
              <AwardPointsBadge points={tournamentPrediction.winner_points} />
              {tournamentResolutions.tournamentWinner && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk-dim">
                  Result: {tournamentResolutions.tournamentWinner}
                </span>
              )}
            </p>
            <p className="text-sm">
              ⚽ Golden Boot:{" "}
              <span className="font-display uppercase tracking-wide">{tournamentPrediction.golden_boot_player ?? "—"}</span>
              <AwardPointsBadge points={tournamentPrediction.golden_boot_points} />
              {tournamentResolutions.goldenBootWinner && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-chalk-dim">
                  Result: {tournamentResolutions.goldenBootWinner}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="card md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-2xl font-bold uppercase tracking-wide">Match predictions</p>
          {allRows.length > 0 && (
            <div className="flex gap-1">
              {(["upcoming", "past"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setMatchSubTab(t)}
                  className={`rounded-lg border px-3 py-1.5 font-display text-xs uppercase tracking-wide transition ${
                    matchSubTab === t
                      ? "border-booking bg-booking text-pitch-950"
                      : "border-pitch-700 text-chalk-dim"
                  }`}
                >
                  {t === "upcoming" ? `Upcoming · ${upcomingRows.length}` : `Past · ${pastRows.length}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {allRows.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-dim">
            You haven&apos;t predicted any matches yet — head to Fixtures to make some.
          </p>
        ) : visibleRows.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-dim">
            {matchSubTab === "upcoming" ? "No upcoming matches you've predicted." : "No finished matches yet."}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {visibleRows.map(({ prediction, match }) => {
              const live = LIVE_STATUSES.has(match.status);
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
                    <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
                      {STAGE_LABEL[match.stage] ?? match.stage} · {kickoffLocal}
                    </p>
                    <p className="flex items-center truncate font-display uppercase tracking-wide">
                      {live && (
                        <span className="mr-1.5 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-sendoff" />
                      )}
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

      <div className="card md:col-span-1">
        <p className="font-display text-2xl font-bold uppercase tracking-wide">Your standing</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">Total points</p>
            <p className="font-display text-3xl tabular-nums">{myRow?.points ?? 0}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">Exact scores</p>
            <p className="font-display text-3xl tabular-nums">{myRow?.exact_hits ?? 0}</p>
          </div>
        </div>
        {leaderboardPosition !== null && board.length > 0 && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
            Position: <span className="text-chalk">{ordinal(leaderboardPosition)} of {board.length}</span>
          </p>
        )}
        {tournamentPrediction && (tournamentPrediction.winner_points !== null || tournamentPrediction.golden_boot_points !== null) && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-chalk-dim">
            Tournament awards: {tournamentPrediction.winner_points ?? 0} + {tournamentPrediction.golden_boot_points ?? 0} pts
          </p>
        )}
      </div>
    </div>
  );
}

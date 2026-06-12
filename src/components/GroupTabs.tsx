"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MatchCard, type Match, type MyPrediction } from "@/components/MatchCard";
import { Leaderboard, type BoardRow } from "@/components/Leaderboard";
import { ForfeitsPanel, type ForfeitRow } from "@/components/ForfeitsPanel";
import { BetsPanel, type TournamentPrediction, type TournamentResolutions } from "@/components/BetsPanel";
import { InviteShare } from "@/components/InviteShare";
import { STAGE_LABEL, VOTE_STAGES } from "@/lib/stages";

type Group = { id: string; name: string; host_id: string; max_tier: number; invite_code: string };

export function GroupTabs({
  group,
  isHost,
  currentUserId,
  vetoUsed,
  matches,
  board,
  forfeits,
  myPredictions,
  fallbackStages,
  openVoteSessionId,
  showTournamentBanner,
  tournamentPrediction,
  tournamentResolutions,
  leaderboardPosition,
}: {
  group: Group;
  isHost: boolean;
  currentUserId: string;
  vetoUsed: boolean;
  matches: Match[];
  board: BoardRow[];
  forfeits: ForfeitRow[];
  myPredictions: MyPrediction[];
  fallbackStages: string[];
  openVoteSessionId: string | null;
  showTournamentBanner: boolean;
  tournamentPrediction: TournamentPrediction;
  tournamentResolutions: TournamentResolutions;
  leaderboardPosition: number | null;
}) {
  const [tab, setTab] = useState<"fixtures" | "table" | "bets" | "forfeits">("fixtures");

  const predsByMatch = useMemo(() => {
    const map = new Map<number, MyPrediction>();
    myPredictions.forEach((p) => map.set(p.match_id, p));
    return map;
  }, [myPredictions]);

  const upcoming = matches.filter((m) => m.status !== "FINISHED");
  const finished = matches.filter((m) => m.status === "FINISHED").reverse();

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <p className="eyebrow">World Cup 2026</p>
      <h1 className="mt-1 font-display text-4xl uppercase">{group.name}</h1>

      <InviteShare code={group.invite_code} groupName={group.name} />

      {showTournamentBanner && (
        <Link href="/predictions" className="card mt-4 block border-booking/40">
          <p className="font-display text-lg uppercase">🏆 Make your tournament picks</p>
          <p className="mt-1 text-xs text-chalk-dim">Winner + Golden Boot — locks June 20</p>
        </Link>
      )}

      <div className="sticky top-0 z-10 -mx-4 mt-5 flex gap-1 bg-pitch-950/90 px-4 py-2 backdrop-blur">
        {(["fixtures", "table", "bets", "forfeits"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-3 py-2 font-display uppercase tracking-wide transition ${
              tab === t ? "bg-booking text-pitch-950" : "text-chalk-dim"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "fixtures" && (
        <div className="mt-4 flex flex-col gap-3">
          {matches.length === 0 && (
            <div className="card text-center text-sm text-chalk-dim">
              No fixtures yet. Hit <code className="text-chalk">/api/sync</code> (with your CRON_SECRET) once to pull them in.
            </div>
          )}
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m} stageLabel={STAGE_LABEL[m.stage] ?? m.stage} myPrediction={predsByMatch.get(m.id)} />
          ))}
          {finished.length > 0 && <p className="eyebrow mt-4">Finished</p>}
          {finished.map((m) => (
            <MatchCard key={m.id} match={m} stageLabel={STAGE_LABEL[m.stage] ?? m.stage} myPrediction={predsByMatch.get(m.id)} />
          ))}
        </div>
      )}

      {tab === "table" && <Leaderboard board={board} currentUserId={currentUserId} />}

      {tab === "bets" && (
        <BetsPanel
          currentUserId={currentUserId}
          matches={matches}
          myPredictions={myPredictions}
          tournamentPrediction={tournamentPrediction}
          tournamentResolutions={tournamentResolutions}
          board={board}
          leaderboardPosition={leaderboardPosition}
        />
      )}

      {tab === "forfeits" && (
        <ForfeitsPanel
          groupId={group.id}
          isHost={isHost}
          currentUserId={currentUserId}
          vetoUsed={vetoUsed}
          forfeits={forfeits}
          stages={VOTE_STAGES}
          fallbackStages={fallbackStages}
          openVoteSessionId={openVoteSessionId}
        />
      )}
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MatchCard, type Match, type MyPrediction, type GroupPrediction } from "@/components/MatchCard";
import { Leaderboard, type BoardRow } from "@/components/Leaderboard";
import { ForfeitsPanel, type ForfeitRow } from "@/components/ForfeitsPanel";
import { BetsPanel, type TournamentPrediction, type TournamentResolutions } from "@/components/BetsPanel";
import { InviteShare } from "@/components/InviteShare";
import { STAGE_LABEL, VOTE_STAGES } from "@/lib/stages";

type Group = { id: string; name: string; host_id: string; max_tier: number; invite_code: string };

const TABS = ["fixtures", "table", "bets", "forfeits"] as const;

export function GroupTabs({
  group,
  isHost,
  currentUserId,
  vetoUsed,
  matches,
  board,
  forfeits,
  myPredictions,
  groupPredictions,
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
  groupPredictions: GroupPrediction[];
  fallbackStages: string[];
  openVoteSessionId: string | null;
  showTournamentBanner: boolean;
  tournamentPrediction: TournamentPrediction;
  tournamentResolutions: TournamentResolutions;
  leaderboardPosition: number | null;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("fixtures");

  const predsByMatch = useMemo(() => {
    const map = new Map<number, MyPrediction>();
    myPredictions.forEach((p) => map.set(p.match_id, p));
    return map;
  }, [myPredictions]);

  const otherPredsByMatch = useMemo(() => {
    const map = new Map<number, GroupPrediction[]>();
    groupPredictions.forEach((p) => {
      if (p.user_id === currentUserId) return;
      const arr = map.get(p.match_id) ?? [];
      arr.push(p);
      map.set(p.match_id, arr);
    });
    return map;
  }, [groupPredictions, currentUserId]);

  const upcoming = matches.filter((m) => m.status !== "FINISHED");
  const finished = matches.filter((m) => m.status === "FINISHED").reverse();

  return (
    <main className="min-h-dvh">
      {/* scoreboard header */}
      <div className="bg-scoreboard">
        <div className="flex h-1.5">
          <div className="flex-1 bg-booking" />
          <div className="flex-1 bg-grass-bright" />
          <div className="flex-1 bg-royal" />
          <div className="flex-1 bg-sendoff" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
          <p className="eyebrow">Group</p>
          <h1 className="mt-1 font-display text-[42px] font-bold uppercase leading-[0.95] md:text-[54px]">{group.name}</h1>

          <InviteShare code={group.invite_code} groupName={group.name} />

          {showTournamentBanner && (
            <Link href="/predictions" className="mt-4 block rounded-2xl border border-booking/30 bg-booking/10 p-4">
              <p className="font-display text-lg uppercase">🏆 Make your tournament picks</p>
              <p className="mt-1 text-xs text-chalk-dim">Winner + Golden Boot — locks June 20</p>
            </Link>
          )}
        </div>
      </div>

      {/* tab bar */}
      <div className="sticky top-12 z-10 overflow-x-auto border-b border-pitch-800 bg-pitch-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-1 px-4 py-2 md:px-8">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 basis-[27%] rounded-xl px-3 py-2 font-display text-sm uppercase tracking-wide transition md:basis-0 md:flex-1 ${
                tab === t ? "bg-booking text-pitch-950" : "text-chalk-dim"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "fixtures" && (
        <div className="bg-pitch-field px-4 py-5 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl">
            {matches.length === 0 && (
              <div className="card text-center text-sm text-chalk-dim">
                No fixtures yet. Hit <code className="text-chalk">/api/sync</code> (with your CRON_SECRET) once to pull them in.
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              {upcoming.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  stageLabel={STAGE_LABEL[m.stage] ?? m.stage}
                  myPrediction={predsByMatch.get(m.id)}
                  otherPredictions={otherPredsByMatch.get(m.id) ?? []}
                />
              ))}
            </div>
            {finished.length > 0 && <p className="eyebrow mb-3 mt-6">Finished</p>}
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              {finished.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  stageLabel={STAGE_LABEL[m.stage] ?? m.stage}
                  myPrediction={predsByMatch.get(m.id)}
                  otherPredictions={otherPredsByMatch.get(m.id) ?? []}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "table" && (
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <Leaderboard board={board} currentUserId={currentUserId} />
        </div>
      )}

      {tab === "bets" && (
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
          <BetsPanel
            currentUserId={currentUserId}
            matches={matches}
            myPredictions={myPredictions}
            tournamentPrediction={tournamentPrediction}
            tournamentResolutions={tournamentResolutions}
            board={board}
            leaderboardPosition={leaderboardPosition}
          />
        </div>
      )}

      {tab === "forfeits" && (
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
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
        </div>
      )}
    </main>
  );
}

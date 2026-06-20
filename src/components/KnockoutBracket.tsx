"use client";

import { useState } from "react";
import Image from "next/image";
import type { Match } from "@/components/MatchCard";

const KNOCKOUT_STAGES = [
  { key: "LAST_32",        label: "R32"   },
  { key: "LAST_16",        label: "R16"   },
  { key: "QUARTER_FINALS", label: "QF"    },
  { key: "SEMI_FINALS",    label: "SF"    },
  { key: "THIRD_PLACE",    label: "3rd"   },
  { key: "FINAL",          label: "Final" },
] as const;

type KnockoutStageKey = (typeof KNOCKOUT_STAGES)[number]["key"];

const EMPTY_MESSAGES: Record<KnockoutStageKey, string> = {
  LAST_32:        "Round of 32 fixtures will appear once the group stage is complete.",
  LAST_16:        "Round of 16 fixtures will appear once R32 is complete.",
  QUARTER_FINALS: "Quarter-final fixtures will appear once R16 is complete.",
  SEMI_FINALS:    "Semi-final fixtures will appear once the quarter-finals are complete.",
  THIRD_PLACE:    "3rd-place play-off will appear once the semis are complete.",
  FINAL:          "Final fixture will appear once the semis are complete.",
};

const LIVE_STATUSES = new Set(["LIVE", "IN_PLAY", "PAUSED"]);

function fmtKickoff(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MatchSlot({ match }: { match: Match }) {
  const isLive = LIVE_STATUSES.has(match.status);
  const isFinished = match.status === "FINISHED";

  return (
    <div className="card flex items-center gap-3 py-3">
      {/* Home team */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {match.home_crest ? (
          <Image src={match.home_crest} alt="" width={20} height={20} className="shrink-0 object-contain" />
        ) : (
          <span className="inline-block h-5 w-5 shrink-0 rounded-sm bg-pitch-700" />
        )}
        <span className="truncate font-display text-sm uppercase tracking-wide">
          {match.home_team}
        </span>
      </div>

      {/* Score or time */}
      <div className="shrink-0 text-center">
        {isFinished ? (
          <p className="font-display text-lg tabular-nums leading-none">
            {match.home_score ?? "–"}&nbsp;–&nbsp;{match.away_score ?? "–"}
          </p>
        ) : isLive ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-sendoff">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sendoff" />
              Live
            </span>
            <p className="font-display text-lg tabular-nums leading-none">
              {match.home_score ?? "–"}&nbsp;–&nbsp;{match.away_score ?? "–"}
            </p>
          </div>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-chalk-dim">
            {fmtKickoff(match.kickoff)}
          </p>
        )}
      </div>

      {/* Away team */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="truncate text-right font-display text-sm uppercase tracking-wide">
          {match.away_team}
        </span>
        {match.away_crest ? (
          <Image src={match.away_crest} alt="" width={20} height={20} className="shrink-0 object-contain" />
        ) : (
          <span className="inline-block h-5 w-5 shrink-0 rounded-sm bg-pitch-700" />
        )}
      </div>
    </div>
  );
}

export function KnockoutBracket({ matches }: { matches: Match[] }) {
  const knockoutMatches = matches.filter((m) =>
    KNOCKOUT_STAGES.some((s) => s.key === m.stage)
  );

  // Default to the first stage that has at least one match, or "LAST_32"
  const firstPopulated =
    KNOCKOUT_STAGES.find((s) => knockoutMatches.some((m) => m.stage === s.key))?.key ?? "LAST_32";

  const [selectedStage, setSelectedStage] = useState<KnockoutStageKey>(firstPopulated);

  const visibleMatches = knockoutMatches
    .filter((m) => m.stage === selectedStage)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  return (
    <div>
      {/* Stage tab strip */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-1.5 pb-1">
          {KNOCKOUT_STAGES.map((s) => {
            const hasMatches = knockoutMatches.some((m) => m.stage === s.key);
            return (
              <button
                key={s.key}
                onClick={() => setSelectedStage(s.key)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 font-display text-xs uppercase tracking-wide transition ${
                  selectedStage === s.key
                    ? "border-booking bg-booking text-pitch-950"
                    : hasMatches
                    ? "border-pitch-700 text-chalk-dim"
                    : "border-pitch-800 text-chalk-dim/40"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Match list */}
      {visibleMatches.length === 0 ? (
        <div className="card py-8 text-center">
          <p className="eyebrow">No fixtures yet</p>
          <p className="mt-2 text-sm text-chalk-dim">{EMPTY_MESSAGES[selectedStage]}</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleMatches.map((m) => (
            <MatchSlot key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}

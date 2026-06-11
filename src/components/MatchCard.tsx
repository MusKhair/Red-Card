"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Match = {
  id: number;
  stage: string;
  home_team: string;
  away_team: string;
  home_crest: string | null;
  away_crest: string | null;
  kickoff: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
};

export type MyPrediction = { match_id: number; pred_home: number; pred_away: number; points: number | null };

function useCountdown(kickoff: string) {
  const [msLeft, setMsLeft] = useState(() => new Date(kickoff).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => setMsLeft(new Date(kickoff).getTime() - Date.now()), 1000);
    return () => clearInterval(t);
  }, [kickoff]);
  return msLeft;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "Locked";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  if (d > 0) return `Locks in ${d}d ${Math.floor((s % 86400) / 3600)}h`;
  const h = Math.floor(s / 3600);
  if (h > 0) return `Locks in ${h}h ${Math.floor((s % 3600) / 60)}m`;
  const m = Math.floor(s / 60);
  return `Locks in ${m}:${String(s % 60).padStart(2, "0")}`;
}

export function MatchCard({
  match,
  stageLabel,
  myPrediction,
}: {
  match: Match;
  stageLabel: string;
  myPrediction?: MyPrediction;
}) {
  const msLeft = useCountdown(match.kickoff);
  const locked = msLeft <= 0;
  const live = match.status === "IN_PLAY" || match.status === "PAUSED";

  const [home, setHome] = useState<string>(myPrediction ? String(myPrediction.pred_home) : "");
  const [away, setAway] = useState<string>(myPrediction ? String(myPrediction.pred_away) : "");
  const [pred, setPred] = useState<MyPrediction | null>(myPrediction ?? null);
  const [saved, setSaved] = useState<boolean>(!!myPrediction);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPred(myPrediction ?? null);
  }, [myPrediction]);

  async function save() {
    setError(null);
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
      return setError("Scores must be 0–20.");
    }
    setSaving(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      setError("Your session expired — sign in again to save predictions.");
      return;
    }
    const { error: err } = await supabase
      .from("predictions")
      .upsert(
        { user_id: auth.user.id, match_id: match.id, pred_home: h, pred_away: a, updated_at: new Date().toISOString() },
        { onConflict: "user_id,match_id" }
      );
    setSaving(false);
    if (err) {
      setError(err.message.includes("policy") ? "Too late — this match is locked." : err.message);
      return;
    }
    setPred({ match_id: match.id, pred_home: h, pred_away: a, points: null });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const kickoffLocal = new Date(match.kickoff).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between text-xs text-chalk-dim">
        <span>{stageLabel}</span>
        {live ? (
          <span className="font-semibold text-grass">● LIVE</span>
        ) : match.status === "FINISHED" ? (
          <span>FT (90 min counts)</span>
        ) : (
          <span className={locked ? "text-sendoff" : "text-booking"}>{fmtCountdown(msLeft)}</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <p className="truncate text-right font-semibold">{match.home_team}</p>
        <p className="font-display text-2xl tabular-nums">
          {match.home_score ?? "–"} : {match.away_score ?? "–"}
        </p>
        <p className="truncate font-semibold">{match.away_team}</p>
      </div>
      <p className="mt-1 text-center text-xs text-chalk-dim">{kickoffLocal}</p>

      {!locked && match.home_team !== "TBD" && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <input
            className="input w-16 text-center"
            inputMode="numeric"
            placeholder="0"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            aria-label={`${match.home_team} predicted goals`}
          />
          <span className="text-chalk-dim">:</span>
          <input
            className="input w-16 text-center"
            inputMode="numeric"
            placeholder="0"
            value={away}
            onChange={(e) => setAway(e.target.value)}
            aria-label={`${match.away_team} predicted goals`}
          />
          <button onClick={save} disabled={saving} className="btn-primary px-4 py-3 text-sm disabled:opacity-50">
            {saved ? "✓" : saving ? "…" : "Lock it"}
          </button>
        </div>
      )}

      {(locked || match.status === "FINISHED") && pred && (
        <p className="mt-2 text-center text-xs text-chalk-dim">
          You said {pred.pred_home}:{pred.pred_away}
          {pred.points !== null && (
            <span className={pred.points > 0 ? "ml-2 font-semibold text-grass" : "ml-2 text-sendoff"}>
              {pred.points > 0 ? `+${pred.points} pts` : "0 pts"}
            </span>
          )}
        </p>
      )}
      {locked && !pred && match.status !== "FINISHED" && (
        <p className="mt-2 text-center text-xs text-sendoff">No prediction — that&apos;s 0 pts, chief.</p>
      )}
      {error && <p className="mt-2 text-center text-xs text-sendoff">{error}</p>}
    </div>
  );
}

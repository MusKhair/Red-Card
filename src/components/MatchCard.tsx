"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

export type GroupPrediction = {
  match_id: number;
  user_id: string;
  display_name: string;
  pred_home: number;
  pred_away: number;
};

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

function clampScore(value: string, delta: number): string {
  const n = parseInt(value, 10);
  const current = Number.isNaN(n) ? 0 : n;
  return String(Math.min(20, Math.max(0, current + delta)));
}

function Crest({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return <div className="h-7 w-7 shrink-0 rounded-full bg-pitch-700/50" aria-hidden />;
  return <Image src={src} alt={alt} width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />;
}

function Stepper({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(clampScore(value, 1))}
        aria-label={`Increase ${label} prediction`}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-pitch-950 font-bold leading-none text-chalk active:scale-90"
      >
        +
      </button>
      <span className="w-8 text-center font-display text-3xl tabular-nums md:text-4xl">{value || "0"}</span>
      <button
        type="button"
        onClick={() => onChange(clampScore(value, -1))}
        aria-label={`Decrease ${label} prediction`}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-pitch-950 font-bold leading-none text-chalk active:scale-90"
      >
        −
      </button>
    </div>
  );
}

export function MatchCard({
  match,
  stageLabel,
  myPrediction,
  otherPredictions = [],
}: {
  match: Match;
  stageLabel: string;
  myPrediction?: MyPrediction;
  otherPredictions?: GroupPrediction[];
}) {
  const msLeft = useCountdown(match.kickoff);
  const locked = msLeft <= 0;
  const live = match.status === "IN_PLAY" || match.status === "PAUSED";
  const finished = match.status === "FINISHED";
  const tbd = match.home_team === "TBD" && !finished;
  const onLight = !finished && !tbd;
  const editable = !locked && !tbd;

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

  const mutedText = onLight ? "text-pitch-500" : "text-chalk-dim";
  const cardClass = tbd
    ? "card"
    : onLight
      ? "rounded-2xl bg-chalk p-4 text-pitch-950"
      : "rounded-2xl border border-pitch-700 bg-pitch-950 p-4 text-chalk";

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${mutedText}`}>{stageLabel}</span>
        {live ? (
          <span className="rounded-full bg-grass px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-pitch-950">
            ● Live
          </span>
        ) : finished ? (
          <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${mutedText}`}>Full time</span>
        ) : (
          <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${locked ? "text-sendoff" : "text-booking"}`}>
            {fmtCountdown(msLeft)}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center justify-end gap-2">
          <p className="truncate text-right font-display text-base uppercase tracking-wide md:text-lg">{match.home_team}</p>
          <Crest src={match.home_crest} alt="" />
        </div>

        {editable ? (
          <div className="flex items-center justify-center gap-3">
            <Stepper value={home} onChange={setHome} label={match.home_team} />
            <span className="font-display text-2xl text-pitch-500">:</span>
            <Stepper value={away} onChange={setAway} label={match.away_team} />
          </div>
        ) : finished ? (
          <p className="text-center font-display text-3xl tabular-nums md:text-4xl">
            {match.home_score ?? "–"} : {match.away_score ?? "–"}
          </p>
        ) : locked && pred ? (
          <p className="text-center font-display text-3xl tabular-nums md:text-4xl">
            {pred.pred_home} : {pred.pred_away}
          </p>
        ) : (
          <p className={`text-center font-display text-3xl tabular-nums md:text-4xl ${mutedText}`}>– : –</p>
        )}

        <div className="flex items-center gap-2">
          <Crest src={match.away_crest} alt="" />
          <p className="truncate font-display text-base uppercase tracking-wide md:text-lg">{match.away_team}</p>
        </div>
      </div>
      <p className={`mt-1 text-center text-xs ${mutedText}`}>{kickoffLocal}</p>

      {editable && (
        <>
          <button onClick={save} disabled={saving} className="btn-primary mt-3 w-full disabled:opacity-50">
            {saved ? "✓ Locked in" : saving ? "Locking…" : "Lock it"}
          </button>
          {error && <p className="mt-2 text-center text-xs text-sendoff">{error}</p>}
        </>
      )}

      {!editable && !tbd && !finished && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <span className="rounded-full bg-pitch-950 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
            Locked
          </span>
          {pred ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-grass-deep">Your call is in</p>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-sendoff">No prediction — 0 pts locked in</p>
          )}
        </div>
      )}

      {finished && (
        <div className="mt-3 flex flex-col items-center gap-1">
          {pred ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-chalk-dim">
                  You said {pred.pred_home}:{pred.pred_away}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    pred.points !== null && pred.points > 0 ? "bg-grass-bright text-pitch-950" : "bg-pitch-800 text-chalk-dim"
                  }`}
                >
                  {pred.points !== null ? (pred.points > 0 ? `+${pred.points} pts` : "0 pts") : "—"}
                </span>
              </div>
              {pred.points !== null && (
                <p
                  className={`font-mono text-[10px] uppercase tracking-[0.25em] ${
                    pred.points > 0 ? "text-grass-bright" : "text-sendoff"
                  }`}
                >
                  {pred.points === 5 ? "Nailed it" : pred.points === 3 ? "So close" : pred.points === 1 ? "Right call" : "Way off"}
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-chalk-dim">No bet placed</p>
          )}
        </div>
      )}

      {locked && !tbd && (
        <div className={`mt-3 border-t pt-2 ${onLight ? "border-pitch-950/10" : "border-pitch-800"}`}>
          <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${mutedText}`}>What the squad said</p>
          {otherPredictions.length === 0 ? (
            <p className={`mt-1 text-xs ${mutedText}`}>No one else predicted this one.</p>
          ) : (
            <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${mutedText}`}>
              {otherPredictions.map((p) => (
                <span key={p.user_id}>
                  <span className={onLight ? "text-pitch-950" : "text-chalk"}>{p.display_name}</span>: {p.pred_home}-
                  {p.pred_away}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

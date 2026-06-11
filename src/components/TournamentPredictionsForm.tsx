"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TOURNAMENT_PREDICTIONS_LOCK } from "@/lib/tournament";

type Initial = {
  winner_team: string | null;
  golden_boot_player: string | null;
  winner_points: number | null;
  golden_boot_points: number | null;
} | null;

function PointsBadge({ points }: { points: number | null }) {
  if (points === null) return null;
  return (
    <span className={points > 0 ? "ml-2 font-semibold text-grass" : "ml-2 text-sendoff"}>
      {points > 0 ? `+${points} pts` : "0 pts"}
    </span>
  );
}

export function TournamentPredictionsForm({
  initial,
  teams,
  finalFinished,
  tournamentWinner,
  goldenBootWinner,
}: {
  initial: Initial;
  teams: string[];
  finalFinished: boolean;
  tournamentWinner: string | null;
  goldenBootWinner: string | null;
}) {
  const locked = Date.now() > new Date(TOURNAMENT_PREDICTIONS_LOCK).getTime();

  const [winnerTeam, setWinnerTeam] = useState(initial?.winner_team ?? "");
  const [goldenBoot, setGoldenBoot] = useState(initial?.golden_boot_player ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gbEntry, setGbEntry] = useState("");
  const [gbSaving, setGbSaving] = useState(false);
  const [gbError, setGbError] = useState<string | null>(null);
  const [gbResolved, setGbResolved] = useState(goldenBootWinner);

  async function save() {
    setError(null);
    if (!winnerTeam.trim() || !goldenBoot.trim()) {
      return setError("Fill in both picks.");
    }
    setSaving(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      setError("Your session expired — sign in again.");
      return;
    }
    const { error: err } = await supabase
      .from("tournament_predictions")
      .upsert(
        {
          user_id: auth.user.id,
          winner_team: winnerTeam.trim(),
          golden_boot_player: goldenBoot.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    setSaving(false);
    if (err) {
      setError(err.message.includes("policy") ? "Picks are locked — the window's closed." : err.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function submitGoldenBoot() {
    setGbError(null);
    if (!gbEntry.trim()) return setGbError("Enter a player name.");
    setGbSaving(true);
    const res = await fetch("/api/tournament/golden-boot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: gbEntry.trim() }),
    });
    const json = await res.json();
    setGbSaving(false);
    if (!res.ok) {
      setGbError(json.error ?? "Something went wrong.");
      return;
    }
    setGbResolved(json.winningValue ?? gbEntry.trim());
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <p className="eyebrow">World Cup 2026</p>
      <h1 className="mt-1 font-display text-4xl uppercase">Tournament picks</h1>
      <p className="mt-2 text-sm text-chalk-dim">
        One set of picks across every group. Locks June 14.
      </p>

      {locked ? (
        <div className="card mt-6">
          <p className="font-display text-xl uppercase">Locked in</p>
          <p className="mt-2 text-sm">
            Winner: <span className="font-semibold">{initial?.winner_team ?? "—"}</span>
            <PointsBadge points={initial?.winner_points ?? null} />
          </p>
          <p className="mt-1 text-sm">
            Golden Boot: <span className="font-semibold">{initial?.golden_boot_player ?? "—"}</span>
            <PointsBadge points={initial?.golden_boot_points ?? null} />
          </p>
        </div>
      ) : (
        <>
          <label className="mt-8 block text-sm text-chalk-dim">Who wins it all?</label>
          <input
            className="input mt-2"
            list="teams"
            value={winnerTeam}
            onChange={(e) => setWinnerTeam(e.target.value)}
            placeholder="Pick a team"
          />
          <datalist id="teams">
            {teams.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>

          <label className="mt-5 block text-sm text-chalk-dim">Golden Boot — top scorer?</label>
          <input
            className="input mt-2"
            value={goldenBoot}
            onChange={(e) => setGoldenBoot(e.target.value)}
            placeholder="Player name"
          />
          <p className="mt-1 text-xs text-chalk-dim">
            Tip: type names without accents (e.g. &quot;Mbappe&quot; not &quot;Mbappé&quot;) to avoid matching issues.
          </p>

          {error && <p className="mt-4 text-sm text-sendoff">{error}</p>}

          <button onClick={save} disabled={saving} className="btn-primary mt-8 w-full disabled:opacity-50">
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save picks"}
          </button>
        </>
      )}

      {(tournamentWinner || finalFinished) && (
        <div className="card mt-6">
          <p className="font-display text-xl uppercase">Results</p>
          <p className="mt-2 text-sm">
            🏆 Winner: <span className="font-semibold">{tournamentWinner ?? "TBD"}</span>
          </p>

          {gbResolved ? (
            <p className="mt-1 text-sm">
              ⚽ Golden Boot: <span className="font-semibold">{gbResolved}</span>
            </p>
          ) : finalFinished ? (
            <>
              <p className="mt-3 text-xs text-chalk-dim">
                Football-Data doesn&apos;t give us scorer data — first one here to enter the official Golden
                Boot winner locks it in for everyone.
              </p>
              <input
                className="input mt-3"
                value={gbEntry}
                onChange={(e) => setGbEntry(e.target.value)}
                placeholder="e.g. Kylian Mbappe"
              />
              {gbError && <p className="mt-2 text-sm text-sendoff">{gbError}</p>}
              <button onClick={submitGoldenBoot} disabled={gbSaving} className="btn-primary mt-3 w-full disabled:opacity-50">
                {gbSaving ? "Saving…" : "Submit"}
              </button>
            </>
          ) : (
            <p className="mt-1 text-sm">⚽ Golden Boot: <span className="font-semibold">TBD</span></p>
          )}
        </div>
      )}

      <Link href="/groups" className="btn-ghost mt-6 block w-full text-center">
        Back to groups
      </Link>
    </main>
  );
}

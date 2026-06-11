import { createAdminClient } from "@/lib/supabase/admin";
import { scorePrediction } from "@/lib/scoring";

const API = "https://api.football-data.org/v4/competitions/WC/matches";

type FdScorePart = { home: number | null; away: number | null };
type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: { name: string | null; crest: string | null };
  awayTeam: { name: string | null; crest: string | null };
  score: {
    duration: string;
    fullTime: FdScorePart;
    regularTime?: FdScorePart;
  };
};

/** 90-minute score. If the match went to extra time, prefer regularTime when the API provides it. */
function ninetyMinScore(m: FdMatch): FdScorePart {
  if (m.score.duration !== "REGULAR" && m.score.regularTime) return m.score.regularTime;
  return m.score.fullTime;
}

/**
 * Pulls all WC matches, upserts them, then awards points for any newly finished matches.
 * Throttled by sync_state (min 60s between runs) so page-triggered syncs can't hammer
 * the free tier (10 calls/min).
 */
export async function syncMatchesAndScore(): Promise<{ synced: boolean; reason?: string }> {
  const admin = createAdminClient();

  const { data: state } = await admin.from("sync_state").select("last_sync").eq("id", 1).single();
  if (state?.last_sync && Date.now() - new Date(state.last_sync).getTime() < 60_000) {
    return { synced: false, reason: "throttled" };
  }
  await admin.from("sync_state").update({ last_sync: new Date().toISOString() }).eq("id", 1);

  const res = await fetch(API, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN! },
    cache: "no-store",
  });
  if (!res.ok) return { synced: false, reason: `football-data ${res.status}` };

  const body = (await res.json()) as { matches: FdMatch[] };

  const rows = body.matches.map((m) => {
    const score = ninetyMinScore(m);
    return {
      id: m.id,
      stage: m.stage,
      home_team: m.homeTeam.name ?? "TBD",
      away_team: m.awayTeam.name ?? "TBD",
      home_crest: m.homeTeam.crest,
      away_crest: m.awayTeam.crest,
      kickoff: m.utcDate,
      status: m.status,
      home_score: score.home,
      away_score: score.away,
    };
  });
  if (rows.length) await admin.from("matches").upsert(rows);

  // Award points for finished, not-yet-scored matches.
  const { data: toScore } = await admin
    .from("matches")
    .select("id, home_score, away_score")
    .eq("status", "FINISHED")
    .eq("scored", false)
    .not("home_score", "is", null);

  for (const match of toScore ?? []) {
    const { data: preds } = await admin
      .from("predictions")
      .select("id, pred_home, pred_away")
      .eq("match_id", match.id);
    for (const p of preds ?? []) {
      const pts = scorePrediction(p.pred_home, p.pred_away, match.home_score!, match.away_score!);
      await admin.from("predictions").update({ points: pts }).eq("id", p.id);
    }
    await admin.from("matches").update({ scored: true }).eq("id", match.id);
  }

  // Auto-close any forfeit votes that have been open for 24h, regardless of turnout.
  const { data: expired } = await admin
    .from("forfeit_vote_sessions")
    .select("id")
    .eq("status", "open")
    .lte("closes_at", new Date().toISOString());
  for (const s of expired ?? []) await admin.rpc("close_forfeit_vote_session", { p_session_id: s.id });

  return { synced: true };
}

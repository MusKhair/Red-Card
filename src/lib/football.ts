import { createAdminClient } from "@/lib/supabase/admin";
import { scorePrediction } from "@/lib/scoring";
import { VOTE_STAGES } from "@/lib/stages";

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
  // The cron now runs daily (Vercel Hobby limit), so most votes will already have
  // closed via the threshold path (cast_forfeit_vote, all members voted) by the
  // time this runs — this is just the once-a-day timeout backstop.
  const { data: expired } = await admin
    .from("forfeit_vote_sessions")
    .select("id")
    .eq("status", "open")
    .lte("closes_at", new Date().toISOString());
  for (const s of expired ?? []) await admin.rpc("close_forfeit_vote_session", { p_session_id: s.id });

  // Auto-open forfeit votes for stages that ended 2h+ ago with no vote yet.
  // Runs for every group × ready stage. auth.uid() is NULL here (service-role client),
  // so opened_by stores NULL — meaning "auto-opened by the cron".
  {
    const { data: allMatches } = await admin.from("matches").select("stage, status, kickoff");
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    const readyStages = VOTE_STAGES.map((s) => s.key).filter((stageKey) => {
      const sm = (allMatches ?? []).filter((m) => m.stage === stageKey);
      if (!sm.length || !sm.every((m) => m.status === "FINISHED")) return false;
      const lastKickoff = Math.max(...sm.map((m) => new Date(m.kickoff).getTime()));
      return Date.now() - lastKickoff >= TWO_HOURS_MS;
    });

    if (readyStages.length) {
      const { data: groups } = await admin.from("groups").select("id");

      for (const group of groups ?? []) {
        for (const stageKey of readyStages) {
          const { data: existing } = await admin
            .from("forfeit_vote_sessions")
            .select("id")
            .eq("group_id", group.id)
            .eq("stage", stageKey)
            .limit(1);
          if (existing?.length) continue;

          const { data: board } = await admin
            .from("group_leaderboard")
            .select("user_id, points, exact_hits")
            .eq("group_id", group.id)
            .order("points", { ascending: true })
            .order("exact_hits", { ascending: true });
          if (!board || board.length < 2) continue;

          const bottomPoints = board[0].points;
          const bottomExact = board[0].exact_hits;
          const tied = board.filter((r) => r.points === bottomPoints && r.exact_hits === bottomExact);
          const loser = tied[Math.floor(Math.random() * tied.length)];

          // Errors (VOTE_ALREADY_OPEN, INSUFFICIENT_POOL, etc.) are silently skipped —
          // the unique index on (group_id) where status='open' is the hard guard.
          await admin.rpc("open_forfeit_vote", {
            p_group_id: group.id,
            p_loser_id: loser.user_id,
            p_stage: stageKey,
            p_is_boss: stageKey === "FINAL",
          });
        }
      }
    }
  }

  // Resolve tournament-long awards (Winner auto from the FINAL match's winner field;
  // Golden Boot via host-entry — see enter_golden_boot_winner). Idempotent no-op if
  // not ready or already resolved.
  await admin.rpc("resolve_tournament_awards");

  return { synced: true };
}

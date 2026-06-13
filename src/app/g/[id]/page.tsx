import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupTabs } from "@/components/GroupTabs";
import type { GroupPrediction } from "@/components/MatchCard";
import { VOTE_STAGES } from "@/lib/stages";
import { TOURNAMENT_PREDICTIONS_LOCK } from "@/lib/tournament";
import { syncMatchesAndScore } from "@/lib/football";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/g/${id}`);

  // Fire-and-forget sync (internally throttled to 1 real API call / 60s).
  syncMatchesAndScore().catch(() => {});

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, host_id, max_tier, invite_code, point_cutoff")
    .eq("id", id)
    .single();
  if (!group) redirect("/groups");

  const [
    { data: matches },
    { data: board },
    { data: forfeits },
    { data: predictions },
    { data: membership },
    { data: groupSessions },
    { data: openSession },
    { data: tournamentPrediction },
    { data: awardResolutions },
    { data: groupMembers },
  ] = await Promise.all([
    supabase.from("matches").select("*").order("kickoff", { ascending: true }),
    supabase
      .from("group_leaderboard")
      .select("*")
      .eq("group_id", id)
      .order("points", { ascending: false })
      .order("exact_hits", { ascending: false }),
    supabase
      .from("forfeits")
      .select(
        "id, stage, status, created_at, user_id, is_boss, vote_session_id, profiles(display_name), forfeit_library(title, tier, description), custom_forfeits(title, tier, description)"
      )
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("predictions").select("match_id, pred_home, pred_away, points").eq("user_id", auth.user.id),
    supabase.from("group_members").select("veto_used").eq("group_id", id).eq("user_id", auth.user.id).single(),
    supabase.from("forfeit_vote_sessions").select("stage").eq("group_id", id),
    supabase.from("forfeit_vote_sessions").select("id").eq("group_id", id).eq("status", "open").maybeSingle(),
    supabase
      .from("tournament_predictions")
      .select("winner_team, golden_boot_player, winner_points, golden_boot_points")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase.from("tournament_award_resolutions").select("award, winning_value"),
    supabase.from("group_members").select("user_id, profiles(display_name)").eq("group_id", id),
  ]);

  const memberRows = (groupMembers ?? []) as unknown as {
    user_id: string;
    profiles: { display_name: string } | null;
  }[];
  const memberIds = memberRows.map((m) => m.user_id);
  const { data: groupPredictionsRaw } = await supabase
    .from("predictions")
    .select("match_id, user_id, pred_home, pred_away")
    .in("user_id", memberIds.length ? memberIds : [auth.user.id]);

  const displayNameByUserId = new Map(memberRows.map((m) => [m.user_id, m.profiles?.display_name ?? "?"]));
  const groupPredictions: GroupPrediction[] = (groupPredictionsRaw ?? []).map((p) => ({
    match_id: p.match_id,
    user_id: p.user_id,
    display_name: displayNameByUserId.get(p.user_id) ?? "?",
    pred_home: p.pred_home,
    pred_away: p.pred_away,
  }));

  const showTournamentBanner =
    !tournamentPrediction && Date.now() < new Date(TOURNAMENT_PREDICTIONS_LOCK).getTime();

  const tournamentResolutions = {
    tournamentWinner: awardResolutions?.find((r) => r.award === "tournament_winner")?.winning_value ?? null,
    goldenBootWinner: awardResolutions?.find((r) => r.award === "golden_boot")?.winning_value ?? null,
  };

  const leaderboardIndex = (board ?? []).findIndex((r) => r.user_id === auth.user.id);
  const leaderboardPosition = leaderboardIndex === -1 ? null : leaderboardIndex + 1;

  // Stages eligible for the "host's gone quiet" fallback: every match in the stage is
  // FINISHED, the last kickoff was 48h+ ago, and nobody has opened a vote for it yet.
  const stagesWithSession = new Set((groupSessions ?? []).map((s) => s.stage));
  const fallbackStages = VOTE_STAGES.map((s) => s.key).filter((stageKey) => {
    if (stagesWithSession.has(stageKey)) return false;
    const stageMatches = (matches ?? []).filter((m) => m.stage === stageKey);
    if (!stageMatches.length || !stageMatches.every((m) => m.status === "FINISHED")) return false;
    const lastKickoff = Math.max(...stageMatches.map((m) => new Date(m.kickoff).getTime()));
    return Date.now() - lastKickoff > FORTY_EIGHT_HOURS_MS;
  });

  return (
    <GroupTabs
      group={group}
      isHost={group.host_id === auth.user.id}
      currentUserId={auth.user.id}
      vetoUsed={membership?.veto_used ?? false}
      matches={matches ?? []}
      board={board ?? []}
      forfeits={(forfeits ?? []) as never[]}
      myPredictions={predictions ?? []}
      groupPredictions={groupPredictions}
      fallbackStages={fallbackStages}
      openVoteSessionId={openSession?.id ?? null}
      showTournamentBanner={showTournamentBanner}
      tournamentPrediction={tournamentPrediction ?? null}
      tournamentResolutions={tournamentResolutions}
      leaderboardPosition={leaderboardPosition}
    />
  );
}

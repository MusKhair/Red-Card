import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentPredictionsForm } from "@/components/TournamentPredictionsForm";

export default async function PredictionsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/predictions");

  const [{ data: prediction }, { data: matches }, { data: resolutions }, { data: memberships }] = await Promise.all([
    supabase
      .from("tournament_predictions")
      .select("winner_team, golden_boot_player, winner_points, golden_boot_points")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase.from("matches").select("home_team, away_team, stage, status"),
    supabase.from("tournament_award_resolutions").select("award, winning_value"),
    supabase.from("group_members").select("group_id").eq("user_id", auth.user.id).order("joined_at", { ascending: true }).limit(1),
  ]);

  const teams = Array.from(
    new Set(
      (matches ?? [])
        .flatMap((m) => [m.home_team, m.away_team])
        .filter((t): t is string => !!t && t !== "TBD")
    )
  ).sort();

  const finalFinished = (matches ?? []).some((m) => m.stage === "FINAL" && m.status === "FINISHED");

  const tournamentWinner =
    resolutions?.find((r) => r.award === "tournament_winner")?.winning_value ?? null;
  const goldenBootWinner =
    resolutions?.find((r) => r.award === "golden_boot")?.winning_value ?? null;

  const firstGroupId = memberships?.[0]?.group_id ?? null;
  const backHref = firstGroupId ? `/g/${firstGroupId}` : "/groups";
  const backLabel = firstGroupId ? "Back to my group" : "Back to my groups";

  return (
    <TournamentPredictionsForm
      initial={prediction ?? null}
      teams={teams}
      finalFinished={finalFinished}
      tournamentWinner={tournamentWinner}
      goldenBootWinner={goldenBootWinner}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}

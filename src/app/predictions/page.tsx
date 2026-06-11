import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentPredictionsForm } from "@/components/TournamentPredictionsForm";

export default async function PredictionsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/predictions");

  const [{ data: prediction }, { data: matches }, { data: resolutions }] = await Promise.all([
    supabase
      .from("tournament_predictions")
      .select("winner_team, golden_boot_player, winner_points, golden_boot_points")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase.from("matches").select("home_team, away_team, stage, status"),
    supabase.from("tournament_award_resolutions").select("award, winning_value"),
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

  return (
    <TournamentPredictionsForm
      initial={prediction ?? null}
      teams={teams}
      finalFinished={finalFinished}
      tournamentWinner={tournamentWinner}
      goldenBootWinner={goldenBootWinner}
    />
  );
}

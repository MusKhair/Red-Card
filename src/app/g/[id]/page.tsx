import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupTabs } from "@/components/GroupTabs";
import { syncMatchesAndScore } from "@/lib/football";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/g/${id}`);

  // Fire-and-forget sync (internally throttled to 1 real API call / 60s).
  syncMatchesAndScore().catch(() => {});

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, host_id, max_tier, invite_code")
    .eq("id", id)
    .single();
  if (!group) redirect("/groups");

  const [{ data: matches }, { data: board }, { data: forfeits }, { data: predictions }, { data: membership }] =
    await Promise.all([
      supabase.from("matches").select("*").order("kickoff", { ascending: true }),
      supabase
        .from("group_leaderboard")
        .select("*")
        .eq("group_id", id)
        .order("points", { ascending: false })
        .order("exact_hits", { ascending: false }),
      supabase
        .from("forfeits")
        .select("id, stage, status, created_at, user_id, profiles(display_name), forfeit_library(title, tier, description)")
        .eq("group_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("predictions").select("match_id, pred_home, pred_away, points").eq("user_id", auth.user.id),
      supabase.from("group_members").select("veto_used").eq("group_id", id).eq("user_id", auth.user.id).single(),
    ]);

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
    />
  );
}

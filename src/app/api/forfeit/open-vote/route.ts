import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * POST { groupId, stage }
 * Opens a forfeit vote for whoever's bottom of the leaderboard. Host can open any
 * stage at any time; non-hosts can only open a stage once it's fully FINISHED and
 * the last kickoff was 48h+ ago with nobody having opened a vote for it yet.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { groupId, stage } = (await req.json()) as { groupId?: string; stage?: string };
  if (!groupId || !stage) return NextResponse.json({ error: "groupId and stage required" }, { status: 400 });

  const { data: group } = await supabase
    .from("groups")
    .select("id, host_id")
    .eq("id", groupId)
    .single();
  if (!group) return NextResponse.json({ error: "group not found" }, { status: 404 });

  const isHost = group.host_id === auth.user.id;
  if (!isHost) {
    const { data: stageMatches } = await supabase.from("matches").select("status, kickoff").eq("stage", stage);
    const stageEnded =
      !!stageMatches?.length &&
      stageMatches.every((m) => m.status === "FINISHED") &&
      Date.now() - Math.max(...stageMatches.map((m) => new Date(m.kickoff).getTime())) > FORTY_EIGHT_HOURS_MS;

    const { data: existingSession } = await supabase
      .from("forfeit_vote_sessions")
      .select("id")
      .eq("group_id", groupId)
      .eq("stage", stage)
      .limit(1);

    if (!stageEnded || (existingSession && existingSession.length > 0)) {
      return NextResponse.json({ error: "Only the host can open a vote right now." }, { status: 403 });
    }
  }

  const { data: board } = await supabase
    .from("group_leaderboard")
    .select("user_id, points, exact_hits")
    .eq("group_id", groupId)
    .order("points", { ascending: true })
    .order("exact_hits", { ascending: true });
  if (!board || board.length < 2) {
    return NextResponse.json({ error: "need at least 2 members" }, { status: 400 });
  }

  const bottomPoints = board[0].points;
  const bottomExact = board[0].exact_hits;
  const tied = board.filter((r) => r.points === bottomPoints && r.exact_hits === bottomExact);
  const loser = tied[Math.floor(Math.random() * tied.length)];

  const { data: sessionId, error } = await supabase.rpc("open_forfeit_vote", {
    p_group_id: groupId,
    p_loser_id: loser.user_id,
    p_stage: stage,
    p_is_boss: stage === "FINAL",
  });
  if (error) {
    if (error.message.includes("VOTE_ALREADY_OPEN")) {
      return NextResponse.json({ error: "A vote is already open for this group." }, { status: 409 });
    }
    if (error.message.includes("INSUFFICIENT_POOL")) {
      return NextResponse.json({ error: "Not enough forfeits in the pool to open a vote." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId });
}

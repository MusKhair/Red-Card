import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST { groupId, stage }
 * Host only. Finds the bottom of the leaderboard, draws a random forfeit at the
 * group's max tier, assigns it. Ties at the bottom: random pick among the tied.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { groupId, stage } = (await req.json()) as { groupId?: string; stage?: string };
  if (!groupId || !stage) return NextResponse.json({ error: "groupId and stage required" }, { status: 400 });

  const { data: group } = await supabase
    .from("groups")
    .select("id, host_id, max_tier")
    .eq("id", groupId)
    .single();
  if (!group) return NextResponse.json({ error: "group not found" }, { status: 404 });
  if (group.host_id !== auth.user.id) {
    return NextResponse.json({ error: "only the host can assign forfeits" }, { status: 403 });
  }

  const { data: board } = await supabase
    .from("group_leaderboard")
    .select("user_id, points")
    .eq("group_id", groupId)
    .order("points", { ascending: true });
  if (!board || board.length < 2) {
    return NextResponse.json({ error: "need at least 2 members" }, { status: 400 });
  }

  const bottomPoints = board[0].points;
  const tied = board.filter((r) => r.points === bottomPoints);
  const loser = tied[Math.floor(Math.random() * tied.length)];

  const { data: pool } = await supabase
    .from("forfeit_library")
    .select("id")
    .lte("tier", group.max_tier);
  if (!pool?.length) return NextResponse.json({ error: "forfeit library empty — run seed.sql" }, { status: 500 });
  const pick = pool[Math.floor(Math.random() * pool.length)];

  const { data: forfeit, error } = await supabase
    .from("forfeits")
    .insert({ group_id: groupId, user_id: loser.user_id, library_id: pick.id, stage })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ forfeitId: forfeit.id });
}

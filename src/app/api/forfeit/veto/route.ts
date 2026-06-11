import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST { forfeitId }
 * The assigned loser may veto ONE forfeit per tournament.
 *
 * - Forfeits from the new vote flow (vote_session_id set): voids the originating
 *   vote session and opens a fresh vote (random 3-option re-roll, same stage/boss flag).
 *   The new vote is opened first so a failure (e.g. INSUFFICIENT_POOL) leaves the
 *   original forfeit untouched.
 * - Legacy forfeits (vote_session_id null, from the old /api/forfeit/assign flow):
 *   fall back to the original veto_forfeit RPC (random library re-draw).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { forfeitId } = (await req.json()) as { forfeitId?: string };
  if (!forfeitId) return NextResponse.json({ error: "forfeitId required" }, { status: 400 });

  const { data: forfeit } = await supabase
    .from("forfeits")
    .select("id, group_id, user_id, stage, status, is_boss, vote_session_id")
    .eq("id", forfeitId)
    .single();
  if (!forfeit) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (forfeit.user_id !== auth.user.id) return NextResponse.json({ error: "not your forfeit" }, { status: 403 });
  if (forfeit.status !== "assigned") return NextResponse.json({ error: "already resolved" }, { status: 400 });

  const { data: membership } = await supabase
    .from("group_members")
    .select("veto_used")
    .eq("group_id", forfeit.group_id)
    .eq("user_id", auth.user.id)
    .single();
  if (membership?.veto_used) {
    return NextResponse.json({ error: "You already used your veto this tournament." }, { status: 400 });
  }

  // Legacy path: forfeit predates the voting system — keep the old random re-draw veto.
  if (!forfeit.vote_session_id) {
    const { data, error } = await supabase.rpc("veto_forfeit", { fid: forfeitId });
    if (error) {
      const msg = error.message.includes("VETO_ALREADY_USED")
        ? "You already used your veto this tournament."
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ forfeitId: data });
  }

  // New flow: open the re-vote first, then void the old session/forfeit and burn the veto.
  const { data: sessionId, error } = await supabase.rpc("open_forfeit_vote", {
    p_group_id: forfeit.group_id,
    p_loser_id: forfeit.user_id,
    p_stage: forfeit.stage,
    p_is_boss: forfeit.is_boss,
    p_veto_origin: forfeit.vote_session_id,
  });
  if (error) {
    const msg = error.message.includes("VOTE_ALREADY_OPEN")
      ? "A vote is already open for this group — try again once it closes."
      : error.message.includes("INSUFFICIENT_POOL")
      ? "Not enough forfeits in the pool for a re-vote."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from("forfeits").update({ status: "vetoed" }).eq("id", forfeitId);
  await admin.from("group_members").update({ veto_used: true }).eq("group_id", forfeit.group_id).eq("user_id", auth.user.id);
  await admin.from("forfeit_vote_sessions").update({ status: "voided" }).eq("id", forfeit.vote_session_id);

  return NextResponse.json({ sessionId });
}

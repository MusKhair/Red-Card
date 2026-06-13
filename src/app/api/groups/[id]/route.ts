import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE — host-only. Deletes the group. Cascades (already in schema.sql) remove
 * group_members, forfeits, custom_forfeits, forfeit_vote_sessions/options/votes,
 * and custom_forfeit_approval_votes. Predictions/player_predictions are
 * user+match scoped and intentionally untouched.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: group } = await supabase.from("groups").select("host_id").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (group.host_id !== auth.user.id) {
    return NextResponse.json({ error: "only the host can delete this group" }, { status: 403 });
  }

  const { error } = await supabase.from("groups").delete().eq("id", id).eq("host_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

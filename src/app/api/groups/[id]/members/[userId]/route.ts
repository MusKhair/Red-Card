import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** DELETE — host-only. Removes another member from the group (kick). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: group } = await supabase.from("groups").select("host_id").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (group.host_id !== auth.user.id) {
    return NextResponse.json({ error: "only the host can remove members" }, { status: 403 });
  }
  if (userId === auth.user.id) {
    return NextResponse.json({ error: "host can't remove themselves" }, { status: 400 });
  }

  const { error } = await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

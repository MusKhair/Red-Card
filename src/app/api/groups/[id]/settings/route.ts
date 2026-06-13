import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET — group settings for the drawer: name, host status, and member list. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: group } = await supabase.from("groups").select("name, host_id").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id, profiles(display_name)")
    .eq("group_id", id);

  const members = ((memberRows ?? []) as unknown as { user_id: string; profiles: { display_name: string } | null }[]).map(
    (m) => ({
      user_id: m.user_id,
      display_name: m.profiles?.display_name ?? "?",
    })
  );

  return NextResponse.json({
    groupName: group.name,
    isHost: group.host_id === auth.user.id,
    currentUserId: auth.user.id,
    members,
  });
}

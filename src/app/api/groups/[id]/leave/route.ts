import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** DELETE — a non-host member leaves the group. Predictions are untouched. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: group } = await supabase.from("groups").select("host_id").eq("id", id).single();
  if (!group) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (group.host_id === auth.user.id) {
    return NextResponse.json(
      { error: "You're the host. To leave, delete the group (which removes everyone)." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

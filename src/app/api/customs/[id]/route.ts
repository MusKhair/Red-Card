import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Proposer can delete while pending; the host can delete a proposal in any status. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: custom } = await supabase
    .from("custom_forfeits")
    .select("id, group_id, proposer_id, status")
    .eq("id", id)
    .single();
  if (!custom) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: group } = await supabase.from("groups").select("host_id").eq("id", custom.group_id).single();
  const isHost = group?.host_id === auth.user.id;
  const isProposer = custom.proposer_id === auth.user.id;

  const allowed = isHost || (isProposer && custom.status === "pending_approval");
  if (!allowed) return NextResponse.json({ error: "not allowed" }, { status: 403 });

  const { error } = await supabase.from("custom_forfeits").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

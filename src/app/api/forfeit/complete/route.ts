import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST { forfeitId } — host marks a forfeit done (proof lives in the group chat). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { forfeitId } = (await req.json()) as { forfeitId?: string };
  if (!forfeitId) return NextResponse.json({ error: "forfeitId required" }, { status: 400 });

  const { data: forfeit } = await supabase
    .from("forfeits")
    .select("id, group_id, status")
    .eq("id", forfeitId)
    .single();
  if (!forfeit) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: group } = await supabase
    .from("groups")
    .select("host_id")
    .eq("id", forfeit.group_id)
    .single();
  if (group?.host_id !== auth.user.id) {
    return NextResponse.json({ error: "only the host can confirm completion" }, { status: 403 });
  }

  const { error } = await supabase
    .from("forfeits")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", forfeitId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

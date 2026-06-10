import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST { forfeitId }
 * The assigned loser may veto ONE forfeit per tournament. The replacement is drawn
 * randomly server-side (security definer RPC) so the loser can't hand-pick it.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { forfeitId } = (await req.json()) as { forfeitId?: string };
  if (!forfeitId) return NextResponse.json({ error: "forfeitId required" }, { status: 400 });

  const { data, error } = await supabase.rpc("veto_forfeit", { fid: forfeitId });
  if (error) {
    const msg = error.message.includes("VETO_ALREADY_USED")
      ? "You already used your veto this tournament."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ forfeitId: data });
}

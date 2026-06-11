import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST — manual trigger for resolve_tournament_awards. Idempotent (no-op if not
 * ready or already resolved). Also runs automatically in the daily sync.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("resolve_tournament_awards");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

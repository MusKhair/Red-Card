import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  PLAYER_NAME_REQUIRED: "Enter a player name.",
  FINAL_NOT_FINISHED: "The Final hasn't finished yet.",
};

/** POST { playerName } — host-entry fallback for the Golden Ball winner (idempotent, first writer wins). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { playerName } = (await req.json()) as { playerName?: string };
  if (!playerName?.trim()) return NextResponse.json({ error: "playerName required" }, { status: 400 });

  const { data, error } = await supabase.rpc("enter_golden_ball_winner", { p_player_name: playerName.trim() });
  if (error) {
    const key = Object.keys(ERROR_MESSAGES).find((k) => error.message.includes(k));
    return NextResponse.json({ error: key ? ERROR_MESSAGES[key] : error.message }, { status: 400 });
  }

  return NextResponse.json({ winningValue: data?.winning_value, newlyResolved: data?.newly_resolved });
}

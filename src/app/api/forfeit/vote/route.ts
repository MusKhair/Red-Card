import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Vote not found.",
  VOTE_CLOSED: "This vote has already closed.",
  NOT_A_MEMBER: "You're not a member of this group.",
  LOSER_CANNOT_VOTE: "You can't vote on your own forfeit.",
  INVALID_OPTION: "Invalid option.",
};

/** POST { sessionId, optionId } — thin wrapper around cast_forfeit_vote. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId, optionId } = (await req.json()) as { sessionId?: string; optionId?: string };
  if (!sessionId || !optionId) return NextResponse.json({ error: "sessionId and optionId required" }, { status: 400 });

  const { data, error } = await supabase.rpc("cast_forfeit_vote", {
    p_session_id: sessionId,
    p_option_id: optionId,
  });
  if (error) {
    const key = Object.keys(ERROR_MESSAGES).find((k) => error.message.includes(k));
    return NextResponse.json({ error: key ? ERROR_MESSAGES[key] : error.message }, { status: 400 });
  }

  return NextResponse.json({ closed: data?.closed ?? false });
}

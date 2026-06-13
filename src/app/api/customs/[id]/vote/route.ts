import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: "Proposal not found.",
  NOT_PENDING: "This proposal has already been resolved.",
  NOT_A_MEMBER: "You're not a member of this group.",
};

/** POST { vote: boolean } — thin wrapper around cast_custom_approval_vote. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { vote } = (await req.json()) as { vote?: boolean };
  if (typeof vote !== "boolean") return NextResponse.json({ error: "vote (boolean) required" }, { status: 400 });

  const { data, error } = await supabase.rpc("cast_custom_approval_vote", {
    p_custom_forfeit_id: id,
    p_vote: vote,
  });
  if (error) {
    const key = Object.keys(ERROR_MESSAGES).find((k) => error.message.includes(k));
    return NextResponse.json({ error: key ? ERROR_MESSAGES[key] : error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

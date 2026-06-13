import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PROOF_OPTIONS } from "@/lib/forfeits";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { groupId, title, description, tier, proof } = (await req.json()) as {
    groupId?: string;
    title?: string;
    description?: string;
    tier?: number;
    proof?: string;
  };

  if (!groupId || !title?.trim() || !description?.trim() || !tier || !proof) {
    return NextResponse.json({ error: "groupId, title, description, tier, and proof are required" }, { status: 400 });
  }
  if (title.trim().length > 60) {
    return NextResponse.json({ error: "Title must be 60 characters or fewer." }, { status: 400 });
  }
  if (description.trim().length > 200) {
    return NextResponse.json({ error: "Description must be 200 characters or fewer." }, { status: 400 });
  }
  if (![1, 2, 3].includes(tier)) {
    return NextResponse.json({ error: "Tier must be 1, 2, or 3." }, { status: 400 });
  }
  if (!(PROOF_OPTIONS as readonly string[]).includes(proof)) {
    return NextResponse.json({ error: "Invalid proof type." }, { status: 400 });
  }

  const { data: group } = await supabase.from("groups").select("max_tier").eq("id", groupId).single();
  if (!group) return NextResponse.json({ error: "group not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "not a member of this group" }, { status: 403 });

  if (tier > group.max_tier) {
    return NextResponse.json({ error: `Tier can't exceed this group's max tier (${group.max_tier}).` }, { status: 400 });
  }

  const { data: custom, error } = await supabase
    .from("custom_forfeits")
    .insert({
      group_id: groupId,
      proposer_id: auth.user.id,
      title: title.trim(),
      description: description.trim(),
      tier,
      proof,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customForfeitId: custom.id });
}

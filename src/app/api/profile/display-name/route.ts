import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { displayName } = (await req.json()) as { displayName?: string };
  const trimmed = displayName?.trim() ?? "";

  if (!trimmed) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
  if (trimmed.length > 30) return NextResponse.json({ error: "Name must be 30 characters or less." }, { status: 400 });

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed })
    .eq("id", auth.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ displayName: trimmed });
}

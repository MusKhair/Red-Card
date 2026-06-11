import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RevealCard } from "@/components/RevealCard";

export default async function ForfeitRevealPage({
  params,
}: {
  params: Promise<{ id: string; fid: string }>;
}) {
  const { id, fid } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/g/${id}/forfeit/${fid}`);

  const { data: forfeit } = await supabase
    .from("forfeits")
    .select(
      "id, stage, status, is_boss, profiles(display_name), forfeit_library(title, tier, description, proof), custom_forfeits(title, tier, description)"
    )
    .eq("id", fid)
    .single();
  if (!forfeit) redirect(`/g/${id}`);

  const lib = forfeit.forfeit_library as unknown as {
    title: string;
    tier: number;
    description: string;
    proof: string;
  } | null;
  const custom = forfeit.custom_forfeits as unknown as {
    title: string;
    tier: number;
    description: string;
  } | null;
  const source = lib ?? custom;
  const profile = forfeit.profiles as unknown as { display_name: string } | null;

  return (
    <RevealCard
      groupId={id}
      loserName={profile?.display_name ?? "The loser"}
      stage={forfeit.stage}
      title={source?.title ?? ""}
      tier={source?.tier ?? 1}
      description={source?.description ?? ""}
      proof={lib?.proof ?? "Photo or video in the group chat"}
      isBoss={forfeit.is_boss}
    />
  );
}

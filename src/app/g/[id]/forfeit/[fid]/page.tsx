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
    .select("id, stage, status, profiles(display_name), forfeit_library(title, tier, description, proof)")
    .eq("id", fid)
    .single();
  if (!forfeit) redirect(`/g/${id}`);

  const lib = forfeit.forfeit_library as unknown as {
    title: string;
    tier: number;
    description: string;
    proof: string;
  } | null;
  const profile = forfeit.profiles as unknown as { display_name: string } | null;

  return (
    <RevealCard
      groupId={id}
      loserName={profile?.display_name ?? "The loser"}
      stage={forfeit.stage}
      title={lib?.title ?? ""}
      tier={lib?.tier ?? 1}
      description={lib?.description ?? ""}
      proof={lib?.proof ?? ""}
    />
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABEL } from "@/components/GroupTabs";
import { VoteSession, type VoteOption } from "@/components/VoteSession";

type LibOrCustom = { title: string; description: string; tier: number };

export default async function VotePage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=/g/${id}/vote/${sessionId}`);

  const { data: session } = await supabase
    .from("forfeit_vote_sessions")
    .select("id, group_id, loser_id, stage, is_boss, status, resulting_forfeit_id")
    .eq("id", sessionId)
    .single();
  if (!session || session.group_id !== id) redirect(`/g/${id}`);

  if (session.status === "closed") {
    redirect(session.resulting_forfeit_id ? `/g/${id}/forfeit/${session.resulting_forfeit_id}` : `/g/${id}`);
  }
  if (session.status !== "open") redirect(`/g/${id}`);

  const [{ data: options }, { data: loserProfile }, { data: myVote }, { count: castCount }, { count: eligibleCount }] =
    await Promise.all([
      supabase
        .from("forfeit_vote_options")
        .select("id, forfeit_library(title, description, tier), custom_forfeits(title, description, tier)")
        .eq("session_id", sessionId),
      supabase.from("profiles").select("display_name").eq("id", session.loser_id).single(),
      supabase.from("forfeit_votes").select("option_id").eq("session_id", sessionId).eq("user_id", auth.user.id).maybeSingle(),
      supabase.from("forfeit_votes").select("*", { count: "exact", head: true }).eq("session_id", sessionId),
      supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", session.group_id)
        .neq("user_id", session.loser_id),
    ]);

  const voteOptions: VoteOption[] = (options ?? []).map((o) => {
    const src = (o.forfeit_library ?? o.custom_forfeits) as unknown as LibOrCustom | null;
    return { id: o.id, title: src?.title ?? "?", description: src?.description ?? "", tier: src?.tier ?? 1 };
  });

  const isLoser = auth.user.id === session.loser_id;
  const loserName = (loserProfile as { display_name: string } | null)?.display_name ?? "They";

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <p className="eyebrow">
        {STAGE_LABEL[session.stage] ?? session.stage}
        {session.is_boss ? " · 👑 Boss Forfeit" : ""}
      </p>
      <h1 className="mt-1 font-display text-3xl uppercase">
        {isLoser ? "Your fate, decided by the squad" : `Pick ${loserName}'s forfeit`}
      </h1>
      <p className="mt-2 text-sm text-chalk-dim">
        {isLoser
          ? "This one's about you — everyone else is picking your fate."
          : `${loserName} finished bottom. Choose their sentence from these 3 options.`}
      </p>

      <VoteSession
        sessionId={sessionId}
        options={voteOptions}
        isLoser={isLoser}
        myVoteOptionId={myVote?.option_id ?? null}
        castCount={castCount ?? 0}
        eligibleCount={eligibleCount ?? 0}
      />

      <Link href={`/g/${id}`} className="btn-ghost mt-4 block w-full text-center">
        Back to group
      </Link>
    </main>
  );
}

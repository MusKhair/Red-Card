import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, max_tier, invite_code)")
    .eq("user_id", auth.user.id);

  const groups = (memberships ?? [])
    .map((m) => m.groups as unknown as { id: string; name: string; max_tier: number; invite_code: string } | null)
    .filter((g): g is { id: string; name: string; max_tier: number; invite_code: string } => g !== null);

  const tierLabel = ["", "Friendly", "Challenging", "Extreme"];

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <p className="eyebrow">Your groups</p>
      <h1 className="mt-2 font-display text-5xl uppercase">The squads</h1>

      <div className="mt-8 flex flex-col gap-3">
        {groups.length === 0 ? (
          <div className="card text-center">
            <p className="eyebrow">No groups yet</p>
            <h2 className="mt-2 font-display text-3xl uppercase">Start your first sweepstakes</h2>
            <p className="mt-2 text-sm text-chalk-dim">
              Create a group or join one with an invite code.
            </p>
            <Link href="/groups/new" className="btn-primary mt-6 block w-full">Create a group</Link>
            <Link href="/join" className="btn-ghost mt-3 block w-full">Join with a code</Link>
          </div>
        ) : (
          <>
            {groups.map((g) => (
              <Link key={g.id} href={`/g/${g.id}`} className="card flex items-center justify-between transition active:scale-[0.98]">
                <div>
                  <p className="font-display text-2xl uppercase">{g.name}</p>
                  <p className="text-xs text-chalk-dim">Max tier: {tierLabel[g.max_tier]}</p>
                </div>
                <span className="font-display text-3xl text-booking">→</span>
              </Link>
            ))}
            <Link href="/groups/new" className="btn-primary mt-5 block w-full">Create a group</Link>
            <Link href="/join" className="btn-ghost mt-3 block w-full">Join another group</Link>
          </>
        )}
      </div>
    </main>
  );
}

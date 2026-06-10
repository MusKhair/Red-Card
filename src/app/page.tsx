import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/groups");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <div className="animate-risefade">
        <p className="eyebrow">World Cup 2026</p>
        <h1 className="mt-3 font-display text-6xl uppercase leading-[0.95]">
          Lose the table.
          <br />
          <span className="text-sendoff">Do the forfeit.</span>
        </h1>
        <p className="mt-5 text-chalk-dim">
          Predict every match with your group. Locked at kickoff, scored automatically.
          Whoever&apos;s bottom at the end of each stage pays the price — on camera.
        </p>
      </div>

      <div className="card my-8 rotate-[-1.5deg] border-sendoff/40">
        <p className="eyebrow text-sendoff">Sample sentence</p>
        <p className="mt-2 font-display text-2xl uppercase leading-tight">
          &ldquo;Hamza finished last. The group has chosen: cold shower, 3 minutes, timer in frame.&rdquo;
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-2">
        <Link href="/login" className="btn-primary w-full">Start a group</Link>
        <Link href="/login" className="btn-ghost w-full">I have an invite</Link>
        <p className="px-2 text-center text-xs text-chalk-dim">
          Forfeits are completed at your own risk. By playing you accept the group rules and
          our terms. Under-18s are limited to mild forfeits.
        </p>
      </div>
    </main>
  );
}

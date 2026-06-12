import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isSignedIn = !!data.user;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="animate-risefade text-center">
        <h1 className="font-display text-7xl uppercase leading-none">
          Red <span className="text-sendoff">Card</span>
        </h1>
        <p className="eyebrow mt-3">World Cup forfeit sweepstakes for your group chat</p>
      </div>

      <div className="w-full [perspective:1200px]">
        <div className="animate-cardflip rounded-[2rem] bg-sendoff p-7 shadow-[0_0_120px_rgba(229,56,59,0.45)]">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch-950/70">
            Red card · Final
          </p>
          <h2 className="mt-4 font-display text-6xl uppercase leading-[0.9] text-pitch-950">
            Mus
          </h2>
          <p className="mt-2 font-display text-xl uppercase text-pitch-950/80">
            Bottom of the table
          </p>

          <div className="mt-6 rounded-2xl bg-pitch-950 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-sendoff">
              The sentence · Tier 3
            </p>
            <p className="mt-2 font-display text-3xl uppercase leading-tight text-chalk">The buzz cut</p>
            <p className="mt-2 text-sm text-chalk-dim">
              Clippers, grade 2 or shorter, full head, on camera. No full shave, no eyebrows.
            </p>
          </div>

          <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-pitch-950/60">
            No mercy. See you next tournament.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {isSignedIn ? (
          <Link href="/groups" className="btn-primary w-full">Go to my groups</Link>
        ) : (
          <Link href="/login" className="btn-primary w-full">Sign in with Google</Link>
        )}
        <p className="text-center text-sm text-chalk-dim">
          Sweepstakes are mild → spicy → extreme. Group host picks the limit.
        </p>
      </div>
    </main>
  );
}

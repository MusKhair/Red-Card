import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isSignedIn = !!data.user;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-10">
      <div className="animate-risefade text-center">
        <h1 className="font-display text-7xl uppercase leading-none">
          Red <span className="text-sendoff">Card</span>
        </h1>
        <p className="eyebrow mt-3">World Cup forfeit sweepstakes for your group chat</p>
      </div>

      <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-10">
        <div className="animate-risefade flex justify-center md:w-2/5">
          <svg viewBox="0 0 170 270" className="h-44 w-auto md:h-60" aria-hidden="true">
            {/* head */}
            <circle cx="80" cy="70" r="28" fill="#F2F4EE" stroke="#0A0C0A" strokeWidth="4" />
            {/* stern, pinched eyebrows */}
            <line x1="56" y1="61" x2="74" y2="70" stroke="#0A0C0A" strokeWidth="5" strokeLinecap="round" />
            <line x1="104" y1="61" x2="86" y2="70" stroke="#0A0C0A" strokeWidth="5" strokeLinecap="round" />
            {/* big intense eyes */}
            <circle cx="70" cy="77" r="8" fill="#F2F4EE" stroke="#0A0C0A" strokeWidth="3" />
            <circle cx="70" cy="77" r="3.5" fill="#0A0C0A" />
            <circle cx="92" cy="77" r="8" fill="#F2F4EE" stroke="#0A0C0A" strokeWidth="3" />
            <circle cx="92" cy="77" r="3.5" fill="#0A0C0A" />
            {/* flat stern mouth */}
            <line x1="72" y1="93" x2="90" y2="93" stroke="#0A0C0A" strokeWidth="3" strokeLinecap="round" />
            {/* neck */}
            <rect x="72" y="97" width="16" height="10" fill="#F2F4EE" />
            {/* torso + shorts */}
            <path d="M50,109 L112,109 L104,215 L58,215 Z" fill="#0A0C0A" />
            {/* white collar */}
            <path d="M68,109 L94,109 L81,129 Z" fill="#F2F4EE" />
            {/* arm at side */}
            <path d="M52,111 L66,111 L60,165 L46,165 Z" fill="#0A0C0A" />
            <circle cx="50" cy="169" r="9" fill="#F2F4EE" />
            {/* arm raised, holding the card */}
            <path d="M104,109 L120,109 L126,46 L110,46 Z" fill="#0A0C0A" />
            <circle cx="118" cy="44" r="10" fill="#F2F4EE" />
            <rect x="104" y="6" width="28" height="40" rx="4" fill="#E5383B" />
            {/* legs */}
            <rect x="62" y="215" width="14" height="35" fill="#F2F4EE" />
            <rect x="86" y="215" width="14" height="35" fill="#F2F4EE" />
            {/* shoes */}
            <rect x="58" y="250" width="22" height="12" rx="4" fill="#0A0C0A" />
            <rect x="82" y="250" width="22" height="12" rx="4" fill="#0A0C0A" />
          </svg>
        </div>

        <div className="w-full md:w-3/5 [perspective:1200px]">
          <div className="animate-cardflip rounded-[2rem] bg-sendoff p-5 shadow-[0_0_120px_rgba(229,56,59,0.45)]">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch-950/70">
              Red card · Final
            </p>
            <h2 className="mt-3 font-display text-4xl uppercase leading-[0.9] text-pitch-950">
              Mus
            </h2>
            <p className="mt-1 font-display text-sm uppercase text-pitch-950/80">
              Bottom of the table
            </p>

            <div className="mt-4 rounded-2xl bg-pitch-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sendoff">
                The sentence · Tier 3
              </p>
              <p className="mt-1 font-display text-2xl uppercase leading-tight text-chalk">The buzz cut</p>
              <p className="mt-1 text-xs text-chalk-dim">
                Clippers, grade 2 or shorter, full head, on camera. No full shave, no eyebrows.
              </p>
            </div>

            <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-pitch-950/60">
              No mercy. See you next tournament.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
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

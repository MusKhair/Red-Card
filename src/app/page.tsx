import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InstallInstructions } from "@/components/InstallInstructions";

export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isSignedIn = !!data.user;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-pitch-950 bg-[radial-gradient(440px_300px_at_50%_6%,rgba(229,56,59,0.30),transparent_64%),radial-gradient(280px_200px_at_50%_2%,rgba(255,214,10,0.10),transparent_60%)] md:bg-[radial-gradient(700px_420px_at_80%_30%,rgba(229,56,59,0.16),transparent_62%)]">
      {/* decorative stadium-light beams */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
        <div className="absolute -top-1/4 left-1/4 h-[140%] w-16 rotate-[16deg] bg-gradient-to-b from-white/5 to-transparent blur-sm" />
        <div className="absolute -top-1/4 left-[58%] h-[140%] w-12 rotate-[-12deg] bg-gradient-to-b from-booking/10 to-transparent blur-sm" />
      </div>

      <div className="relative mx-auto flex max-w-[1360px] flex-col gap-7 px-6 py-10 md:grid md:min-h-[600px] md:grid-cols-2 md:items-center md:gap-x-12 md:px-12 md:py-16">
        {/* text block */}
        <div className="flex animate-risefade flex-col gap-4 md:gap-5">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-pitch-700 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
            <span className="h-[5px] w-[5px] rounded-full bg-grass-bright" />
            World Cup · Forfeit Edition
          </div>

          <h1 className="font-display text-[62px] font-bold uppercase leading-[0.82] tracking-tight md:text-[104px] md:leading-[0.78]">
            <span className="text-chalk">Red</span>
            <span className="text-sendoff md:hidden"> Card</span>
            <span className="hidden text-sendoff md:block">Card</span>
          </h1>

          <p className="max-w-[420px] text-[14.5px] leading-[1.45] text-chalk-dim md:text-xl">
            World Cup bets — but the loser pays in <span className="font-semibold text-booking">shame</span>, not money.
          </p>

          <p className="hidden max-w-[420px] text-sm leading-relaxed text-chalk-dim/70 md:block">
            Predict every match with the group chat. Worst record at the final whistle gets sentenced to a forfeit the squad
            votes on.
          </p>
        </div>

        {/* visual block: referee illustration + sample red card */}
        <div className="relative flex flex-col gap-5 md:h-[420px] md:gap-0 [perspective:1200px]">
          <div className="animate-ref-breathe md:absolute md:left-[-10px] md:top-12">
            <Image
              src="/ref.png"
              alt=""
              width={400}
              height={600}
              priority
              className="mx-auto h-52 w-auto md:h-[330px] md:w-auto"
            />
          </div>

          <div className="animate-cardflip rounded-[18px] bg-gradient-to-b from-sendoff to-sendoff-deep p-[17px] shadow-[0_24px_44px_-20px_rgba(229,56,59,0.75)] md:ml-auto md:w-[330px] md:rounded-[22px] md:p-[22px] md:shadow-[0_40px_70px_-26px_rgba(229,56,59,0.7)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pitch-950/60 md:text-[10.5px]">
              Red card · Final
            </p>
            <h2 className="mt-[3px] font-display text-[40px] font-bold uppercase leading-[0.9] text-pitch-950 md:text-[58px] md:leading-[0.86]">
              Mus
            </h2>
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.06em] text-pitch-950/70 md:text-sm">
              Bottom of the table
            </p>

            <div className="mt-[14px] rounded-[13px] bg-pitch-950 p-[14px] md:mt-4 md:rounded-2xl md:p-4">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-sendoff md:text-[10px]">
                The sentence · Tier 3
              </p>
              <p className="mt-[2px] font-display text-[23px] font-bold uppercase leading-tight text-chalk md:text-[28px]">
                The buzz cut
              </p>
              <p className="mt-1 text-[12px] leading-[1.45] text-chalk-dim md:text-[13px]">
                Clippers, grade 2 or shorter, full head, on camera. No full shave, no eyebrows.
              </p>
            </div>

            <p className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-pitch-950/60 md:text-[10px]">
              No mercy. See you next tournament.
            </p>
          </div>
        </div>

        {/* CTA block */}
        <div className="flex animate-risefade flex-col gap-3 md:items-start">
          {isSignedIn ? (
            <Link href="/groups" className="btn-primary w-full md:w-auto md:px-10">
              Go to my groups
            </Link>
          ) : (
            <Link href="/login" className="btn-primary w-full md:w-auto md:px-10">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-[12px] font-extrabold text-[#4285F4]">
                G
              </span>
              Sign in with Google
            </Link>
          )}
          <p className="text-center font-mono text-[11px] leading-relaxed text-chalk-dim/70 md:hidden">
            Sweepstakes go friendly → challenging → extreme.
            <br />
            Group host picks the limit.
          </p>
          {!isSignedIn && <InstallInstructions />}
        </div>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * The signature screen: a full-viewport red card, flipped like a referee pulling
 * it from the pocket. Built to be screenshotted.
 */
export function RevealCard({
  groupId,
  loserName,
  stage,
  title,
  tier,
  description,
  proof,
  isBoss = false,
}: {
  groupId: string;
  loserName: string;
  stage: string;
  title: string;
  tier: number;
  description: string;
  proof: string;
  isBoss?: boolean;
}) {
  async function share() {
    const text = `🟥 RED CARD — ${loserName} finished bottom (${stage}). Sentence: ${title}. ${description}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard.writeText(text);
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-pitch-950 px-5 py-10 [perspective:1200px]">
      {/* spotlight / vignette backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(480px_360px_at_50%_18%,rgba(229,56,59,0.35),transparent_70%)] md:bg-[radial-gradient(720px_520px_at_50%_14%,rgba(229,56,59,0.32),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_0%,transparent_0deg,rgba(0,0,0,0.5)_120deg,transparent_240deg)]" />

      <div className="relative z-10 w-full max-w-sm md:max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sendoff/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
            <span className="h-[5px] w-[5px] rounded-full bg-sendoff" />
            Final whistle · {stage.replace(/_/g, " ")}
          </div>

          <p className="mt-5 font-display text-sm uppercase tracking-[0.35em] text-chalk-dim md:text-base">
            The table has spoken
          </p>

          <h1 className="mt-1 font-display text-[74px] font-bold uppercase leading-[0.9] text-sendoff [text-shadow:0_0_40px_rgba(229,56,59,0.55)] md:text-[118px]">
            {loserName}
          </h1>
          <p className="font-display text-xl uppercase tracking-wide text-chalk-dim md:text-2xl">Bottom of the table</p>
        </div>

        <Image
          src="/ref.png"
          alt=""
          width={400}
          height={600}
          priority
          className="mx-auto mt-6 h-28 w-auto md:h-36"
        />

        <div
          className={`animate-cardflip mt-6 rounded-[2rem] p-7 md:p-9 ${
            isBoss
              ? "bg-gradient-to-b from-booking to-booking-deep shadow-[0_0_120px_rgba(255,214,10,0.4)]"
              : "bg-gradient-to-b from-sendoff to-sendoff-deep shadow-[0_0_120px_rgba(229,56,59,0.45)]"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch-950/70">
            {isBoss && "👑 Boss forfeit · "}Sentenced · Tier {tier}
          </p>

          <div className="mt-4 rounded-2xl bg-pitch-950 p-5 md:p-6">
            <p className={`text-xs uppercase tracking-[0.2em] ${isBoss ? "text-booking" : "text-sendoff"}`}>The sentence</p>
            <p className="mt-2 font-display text-3xl uppercase leading-tight text-chalk md:text-4xl">{title}</p>
            <p className="mt-2 text-sm text-chalk-dim md:text-base">{description}</p>
            <p className="mt-3 text-xs text-chalk-dim">
              <span className="text-chalk">Proof:</span> {proof}
            </p>
          </div>

          <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-pitch-950/60">
            Forfeit due in 48 hours
          </p>
        </div>

        <div className="mt-5 flex animate-risefade flex-col gap-2 md:flex-row md:justify-center">
          <button onClick={share} className="btn-primary w-full md:w-auto md:px-10">
            Send to the group chat
          </button>
          <Link href={`/g/${groupId}`} className="btn-ghost w-full md:w-auto md:px-10">
            Appeal (you will lose)
          </Link>
        </div>
      </div>
    </main>
  );
}

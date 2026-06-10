"use client";

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
}: {
  groupId: string;
  loserName: string;
  stage: string;
  title: string;
  tier: number;
  description: string;
  proof: string;
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
    <main className="grid min-h-dvh place-items-center bg-pitch-950 px-5 py-8 [perspective:1200px]">
      <div className="w-full max-w-sm">
        <div className="animate-cardflip rounded-[2rem] bg-sendoff p-7 shadow-[0_0_120px_rgba(229,56,59,0.45)]">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-pitch-950/70">
            Red card · {stage}
          </p>
          <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] text-pitch-950">
            {loserName}
          </h1>
          <p className="mt-2 font-display text-xl uppercase text-pitch-950/80">
            Bottom of the table
          </p>

          <div className="mt-6 rounded-2xl bg-pitch-950 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-sendoff">
              The sentence · Tier {tier}
            </p>
            <p className="mt-2 font-display text-3xl uppercase leading-tight text-chalk">{title}</p>
            <p className="mt-2 text-sm text-chalk-dim">{description}</p>
            <p className="mt-3 text-xs text-chalk-dim">
              <span className="text-chalk">Proof:</span> {proof}
            </p>
          </div>

          <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-pitch-950/60">
            No mercy. See you next stage.
          </p>
        </div>

        <div className="mt-5 flex animate-risefade flex-col gap-2">
          <button onClick={share} className="btn-primary w-full">Share the shame</button>
          <Link href={`/g/${groupId}`} className="btn-ghost w-full">Back to the group</Link>
        </div>
      </div>
    </main>
  );
}

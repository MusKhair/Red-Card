"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type GroupPreview = { id: string; name: string; max_tier: number; host_name: string; member_count: number };

const TIER_SUMMARY: Record<number, { name: string; color: string; examples: string[] }> = {
  1: {
    name: "Mild",
    color: "text-grass",
    examples: ["Wear the rival's jersey for a day", "Buy the group breakfast", "Winner picks your nickname for 2 weeks"],
  },
  2: {
    name: "Spicy",
    color: "text-booking",
    examples: ["100 pushups on video, no cuts", "Cringe TikTok on your real account for 48h", "3-minute cold shower, timer in frame"],
  },
  3: {
    name: "Extreme",
    color: "text-sendoff",
    examples: ["Buzz cut, grade 2, on camera", "5-minute ice bath", "Group posts from your real social media"],
  },
};

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [tier3Ok, setTier3Ok] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase.rpc("get_group_by_code", { code });
      if (err || !data?.length) setError("This invite code doesn't match any group.");
      else setGroup(data[0] as GroupPreview);
      setLoading(false);
    })();
  }, [code]);

  async function join() {
    if (!group) return;
    setError(null);
    setJoining(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.rpc("join_group", {
      code,
      accept_tier3: tier3Ok,
    });
    if (err) {
      setJoining(false);
      if (err.message.includes("TIER3_CONSENT")) setError("You need to tick the Extreme-tier box to join this group.");
      else if (err.message.includes("UNDER_18")) setError("This group allows forfeits above Tier 1, so it's 18+ only.");
      else if (err.message.includes("DOB_REQUIRED")) router.push(`/onboarding?next=/join/${code}`);
      else setError(err.message);
      return;
    }
    router.push(`/g/${data}`);
  }

  if (loading) return <main className="grid min-h-dvh place-items-center text-chalk-dim">Loading…</main>;

  if (needsLogin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <p className="eyebrow">You&apos;re invited</p>
        <h1 className="mt-2 font-display text-5xl uppercase">Join the sweepstake</h1>
        <p className="mt-4 text-chalk-dim">Sign in first — takes one tap.</p>
        <button onClick={() => router.push(`/login?next=/join/${code}`)} className="btn-primary mt-8 w-full">
          Sign in to join
        </button>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-center">
        <h1 className="font-display text-4xl uppercase text-sendoff">Invalid invite</h1>
        <p className="mt-3 text-chalk-dim">{error ?? "Ask the host for a fresh link."}</p>
      </main>
    );
  }

  const tier = TIER_SUMMARY[group.max_tier];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="eyebrow">Invite from {group.host_name}</p>
      <h1 className="mt-2 font-display text-5xl uppercase">{group.name}</h1>
      <p className="mt-2 text-sm text-chalk-dim">{group.member_count} in so far</p>

      <div className="card mt-6">
        <p className={`font-display text-xl uppercase ${tier.color}`}>
          Forfeits up to: {tier.name}
        </p>
        <p className="mt-2 text-xs text-chalk-dim">Lose a stage, and you could be doing things like:</p>
        <ul className="mt-2 space-y-1 text-sm">
          {tier.examples.map((e) => (
            <li key={e}>— {e}</li>
          ))}
        </ul>
      </div>

      {group.max_tier === 3 && (
        <label className="card mt-4 flex items-start gap-3 border-sendoff/50">
          <input
            type="checkbox"
            checked={tier3Ok}
            onChange={(e) => setTier3Ok(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#E5383B]"
          />
          <span className="text-xs text-chalk-dim">
            I understand this group allows forfeits including buzz cuts, ice baths, public
            embarrassment on my real social media, and content choices made by other group
            members. Forfeits are voluntary and at my own risk. I am 18 or over.
          </span>
        </label>
      )}

      {error && <p className="mt-4 text-sm text-sendoff">{error}</p>}

      <button onClick={join} disabled={joining} className="btn-primary mt-6 w-full disabled:opacity-50">
        {joining ? "Joining…" : "I'm in"}
      </button>
    </main>
  );
}

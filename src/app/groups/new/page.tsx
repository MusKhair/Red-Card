"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TIERS = [
  { tier: 1, name: "Mild", blurb: "Rival jerseys, breakfast tax, nickname clause. Family / office safe." },
  { tier: 2, name: "Spicy", blurb: "100 pushups, cringe TikToks, cold showers. Group-chat legend material." },
  { tier: 3, name: "Extreme", blurb: "Buzz cuts, ice baths, eyebrow slits. Every member must opt in. 18+ only." },
];

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tier, setTier] = useState(2);
  const [pointsMode, setPointsMode] = useState<"continue" | "fresh">("continue");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setError(null);
    if (!name.trim()) return setError("Give your group a name.");
    setSaving(true);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.push("/login");

    const { data: group, error: gErr } = await supabase
      .from("groups")
      .insert({
        name: name.trim(),
        host_id: auth.user.id,
        max_tier: tier,
        point_cutoff: pointsMode === "fresh" ? new Date().toISOString() : null,
      })
      .select("id, invite_code")
      .single();
    if (gErr || !group) {
      setError(gErr?.message ?? "Could not create group.");
      setSaving(false);
      return;
    }

    // host joins their own group through the same consent gate
    const { error: jErr } = await supabase.rpc("join_group", {
      code: group.invite_code,
      accept_tier3: tier === 3,
    });
    if (jErr) {
      setError(
        jErr.message.includes("UNDER_18")
          ? "You're under 18 — you can only host Mild (Tier 1) groups."
          : jErr.message.includes("DOB_REQUIRED")
            ? "Finish onboarding first (date of birth missing)."
            : jErr.message
      );
      setSaving(false);
      return;
    }
    router.push(`/g/${group.id}`);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <p className="eyebrow">New group</p>
      <h1 className="mt-2 font-display text-5xl uppercase">Set the stakes</h1>

      <label className="mt-8 block text-sm text-chalk-dim">Group name</label>
      <input className="input mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Subang Ballers" />

      <p className="mt-6 text-sm text-chalk-dim">Maximum forfeit tier</p>
      <div className="mt-2 flex flex-col gap-2">
        {TIERS.map((t) => (
          <button
            key={t.tier}
            onClick={() => setTier(t.tier)}
            className={`card text-left transition active:scale-[0.98] ${
              tier === t.tier ? "border-booking" : ""
            }`}
          >
            <p className={`font-display text-xl uppercase ${t.tier === 3 ? "text-sendoff" : ""}`}>
              {t.tier}. {t.name}
            </p>
            <p className="mt-1 text-xs text-chalk-dim">{t.blurb}</p>
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-chalk-dim">How are points counted?</p>
      <div className="mt-2 flex flex-col gap-2">
        <label
          className={`card flex items-start gap-3 text-left transition active:scale-[0.98] ${
            pointsMode === "continue" ? "border-booking" : ""
          }`}
        >
          <input
            type="radio"
            name="pointsMode"
            checked={pointsMode === "continue"}
            onChange={() => setPointsMode("continue")}
            className="mt-1.5"
          />
          <span>
            <p className="font-display text-xl uppercase">Continue tournament points</p>
            <p className="mt-1 text-xs text-chalk-dim">
              Every prediction members made this World Cup counts in this group&apos;s leaderboard.
            </p>
          </span>
        </label>
        <label
          className={`card flex items-start gap-3 text-left transition active:scale-[0.98] ${
            pointsMode === "fresh" ? "border-booking" : ""
          }`}
        >
          <input
            type="radio"
            name="pointsMode"
            checked={pointsMode === "fresh"}
            onChange={() => setPointsMode("fresh")}
            className="mt-1.5"
          />
          <span>
            <p className="font-display text-xl uppercase">Start fresh</p>
            <p className="mt-1 text-xs text-chalk-dim">
              Only matches that haven&apos;t kicked off yet will count. Everyone starts at 0.
            </p>
          </span>
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-sendoff">{error}</p>}

      <button onClick={create} disabled={saving} className="btn-primary mt-8 w-full disabled:opacity-50">
        {saving ? "Creating…" : "Create group"}
      </button>
    </main>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/groups";
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    if (!dob) return setError("Date of birth is required — it caps under-18s at friendly forfeits.");
    const dobDate = new Date(dob);
    if (dobDate > new Date()) return setError("That date is in the future.");
    setSaving(true);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.push("/login");

    const update: { dob: string; display_name?: string } = { dob };
    if (name.trim()) update.display_name = name.trim();

    const { error: err } = await supabase.from("profiles").update(update).eq("id", auth.user.id);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    router.push(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="eyebrow">One-time setup</p>
      <h1 className="mt-2 font-display text-4xl uppercase">Who&apos;s playing?</h1>

      <label className="mt-8 block text-sm text-chalk-dim">Display name (what the group sees)</label>
      <input className="input mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mus" />

      <label className="mt-5 block text-sm text-chalk-dim">Date of birth</label>
      <input className="input mt-2" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
      <p className="mt-2 text-xs text-chalk-dim">
        Under-18s can only join groups with friendly (Tier 1) forfeits.
      </p>

      {error && <p className="mt-4 text-sm text-sendoff">{error}</p>}

      <button onClick={save} disabled={saving} className="btn-primary mt-8 w-full disabled:opacity-50">
        {saving ? "Saving…" : "Let's go"}
      </button>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}

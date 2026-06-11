"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CODE_RE = /^[A-Z0-9]{6}$/;

export default function JoinByCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return setError("Enter your invite code.");
    if (!CODE_RE.test(clean)) return setError("Codes are 6 characters — letters and numbers only.");
    router.push(`/join/${clean}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="eyebrow">Got a code?</p>
      <h1 className="mt-2 font-display text-5xl uppercase">Join a group</h1>
      <p className="mt-3 text-chalk-dim">
        Ask the host for their invite code and enter it below.
      </p>

      <form onSubmit={go} className="mt-8">
        <label htmlFor="invite-code" className="block text-sm text-chalk-dim">
          Invite code
        </label>
        <input
          id="invite-code"
          className="input mt-2 text-center font-display text-3xl uppercase tracking-[0.3em]"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="2646F2"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
        />

        {error && <p className="mt-3 text-sm text-sendoff">{error}</p>}

        <button type="submit" className="btn-primary mt-8 w-full">
          Find group
        </button>
      </form>
    </main>
  );
}

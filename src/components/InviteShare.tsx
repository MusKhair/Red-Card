"use client";

import { useState } from "react";

export function InviteShare({ code, groupName }: { code: string; groupName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/join/${code}`;
    const text = `You're invited to "${groupName}" — World Cup predictions, loser does a forfeit. ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={share} className="btn-ghost mt-3 w-full py-3 text-sm">
      {copied ? "Invite copied — paste it in the group chat" : `Share invite · code ${code}`}
    </button>
  );
}

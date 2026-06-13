"use client";

import { useState } from "react";
import Link from "next/link";
import { SettingsDrawer } from "@/components/SettingsDrawer";

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function GlobalHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-pitch-800 bg-pitch-950/95 px-4 backdrop-blur md:px-8">
        <Link href="/" className="font-display text-sm font-bold uppercase tracking-[0.2em]">
          <span className="text-chalk">Red</span>
          <span className="text-sendoff">Card</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-pitch-700 text-chalk-dim transition active:scale-95"
        >
          <GearIcon className="h-4 w-4" />
        </button>
      </header>

      <SettingsDrawer open={open} onClose={() => setOpen(false)} isSignedIn={isSignedIn} />
    </>
  );
}

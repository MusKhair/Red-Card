"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "rc_install_prompt_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      sessionStorage.getItem(DISMISSED_KEY)
    ) return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    dismiss();
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-chalk">Install Red Card 🟥</p>
      <div className="flex items-center gap-2">
        <button onClick={install} className="rounded-lg bg-sendoff px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white">
          Install
        </button>
        <button onClick={dismiss} aria-label="Dismiss" className="flex h-7 w-7 items-center justify-center rounded-full border border-pitch-700 text-chalk-dim">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

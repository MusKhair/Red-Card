"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "rc_ios_hint_dismissed";

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

export function IOSInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOS() || isStandalone() || sessionStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-start justify-between gap-3 rounded-2xl border border-pitch-700 bg-pitch-900 px-4 py-3 shadow-lg">
      <p className="text-sm text-chalk">
        <span className="font-semibold">Add Red Card to Home Screen</span>
        <span className="text-chalk-dim"> — tap the Share button ⎋, then &quot;Add to Home Screen&quot;</span>
      </p>
      <button onClick={dismiss} aria-label="Dismiss" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-pitch-700 text-chalk-dim">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "desktop" | null;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const IOS_STEPS = [
  "Tap the ••• (three dots) at the bottom right of Safari",
  "Tap Share in the menu that pops up",
  "Scroll down in the Share sheet and tap ‘Add to Home Screen’",
  "Tap Add in the top right corner",
];

const ANDROID_STEPS = [
  "Tap the ⋮ (three dots) at the top right of Chrome",
  "Tap ‘Install app’ or ‘Add to Home screen’",
  "Tap Install in the popup",
];

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-4 flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sendoff/20 font-mono text-[11px] font-semibold text-sendoff">
            {i + 1}
          </span>
          <span className="text-sm leading-snug text-chalk-dim">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function InstallInstructions() {
  const [platform, setPlatform] = useState<Platform>(null);

  useEffect(() => {
    if (isStandalone()) return;
    setPlatform(detectPlatform());
  }, []);

  if (!platform) return null;

  if (platform === "desktop") {
    return (
      <p className="mt-1 text-center font-mono text-[11px] leading-relaxed text-chalk-dim/60 md:text-left">
        Open redcard-blue.vercel.app on your phone to install as an app.
      </p>
    );
  }

  const isIOS = platform === "ios";

  return (
    <div className="mt-2 rounded-2xl border border-pitch-800 bg-pitch-900 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-chalk-dim">
        {isIOS ? "iOS · Safari" : "Android · Chrome"}
      </p>
      <h2 className="mt-1 font-display text-xl uppercase tracking-wide text-chalk">
        {isIOS ? "📱 Install on iPhone" : "🤖 Install on Android"}
      </h2>
      <p className="mt-1 text-sm text-chalk-dim">
        Add Red Card to your home screen — looks and works like a real app.
      </p>

      <Steps steps={isIOS ? IOS_STEPS : ANDROID_STEPS} />

      <p className="mt-4 rounded-xl bg-pitch-800 px-3 py-2 text-xs text-chalk-dim">
        {isIOS
          ? "Important: must be opened in Safari (the blue compass app), not Chrome or in-app browsers"
          : "If you don’t see Install, just choose ‘Add to Home screen’ — same result"}
      </p>
    </div>
  );
}

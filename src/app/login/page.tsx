"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * In-app browsers (WhatsApp, Instagram, FB, Telegram) block Google OAuth
 * ("disallowed_useragent"). Detect them and show an escape hatch instead of a
 * broken sign-in button.
 */
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\/|Telegram/i.test(navigator.userAgent);
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/groups";
  const [webview, setWebview] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setWebview(isInAppBrowser()), []);

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="eyebrow">RedCard</p>
      <h1 className="mt-2 font-display text-5xl uppercase">Sign in</h1>

      {webview ? (
        <div className="card mt-6 border-booking/50">
          <p className="font-display text-xl uppercase text-booking">One more tap</p>
          <p className="mt-2 text-sm text-chalk-dim">
            Google blocks sign-in inside WhatsApp&apos;s browser. Open this page in your real
            browser: tap the <strong className="text-chalk">⋮ menu</strong> (top right) →{" "}
            <strong className="text-chalk">Open in browser</strong>. Or copy the link below.
          </p>
          <button onClick={copyLink} className="btn-ghost mt-4 w-full">
            {copied ? "Copied — paste it in Chrome/Safari" : "Copy this link"}
          </button>
        </div>
      ) : (
        <button onClick={signIn} className="btn-primary mt-8 w-full">
          Continue with Google
        </button>
      )}

      <p className="mt-6 text-center text-xs text-chalk-dim">
        By continuing you agree to the terms: forfeits are voluntary and completed at your own risk.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

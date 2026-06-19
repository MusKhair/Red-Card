import type { Metadata, Viewport } from "next";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/GlobalHeader";
import { TermsModal } from "@/components/TermsModal";
import { InstallPrompt } from "@/components/InstallPrompt";
import { IOSInstallHint } from "@/components/IOSInstallHint";
import { Analytics } from "@vercel/analytics/react";
import { createClient } from "@/lib/supabase/server";

const display = Oswald({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RedCard — World Cup forfeit sweepstakes",
  description: "Predict matches with your group. Bottom of the table does the forfeit.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Red Card",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0C0A",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  let needsTermsAcceptance = false;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("terms_accepted_at")
      .eq("id", auth.user.id)
      .single();
    needsTermsAcceptance = !profile?.terms_accepted_at;
  }

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <GlobalHeader isSignedIn={!!auth.user} />
        <TermsModal show={needsTermsAcceptance} />
        <InstallPrompt />
        <IOSInstallHint />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

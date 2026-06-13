import type { Metadata, Viewport } from "next";
import { Oswald, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Oswald({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RedCard — World Cup forfeit sweepstakes",
  description: "Predict matches with your group. Bottom of the table does the forfeit.",
};

export const viewport: Viewport = {
  themeColor: "#0A0C0A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

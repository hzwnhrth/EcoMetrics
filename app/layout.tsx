import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { getStore } from "@/lib/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ESG Evidence & Action Tool",
  description:
    "Extracts facts from messy documents, finds gaps with deterministic rules, and anchors the report on Solana devnet.",
};

// every page reads the store; render on demand, never from the static cache
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await getStore();
  const tally = { verified: 0, estimated: 0, inferred: 0 };
  for (const e of store.evidence) tally[e.confidence]++;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TopNav
          tally={`${tally.verified} verified · ${tally.estimated} estimated · ${tally.inferred} inferred`}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}

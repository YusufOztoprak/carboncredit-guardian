import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import NetworkBanner from "@/components/NetworkBanner";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarbonCredit Guardian",
  description: "Verified, single-use carbon credits",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-slate-50 text-slate-900`}>
        <Providers>
          <NetworkBanner />
          <div className="lg:flex">
            <Suspense fallback={null}>
              <Nav />
            </Suspense>
            <main className="min-w-0 flex-1 px-4 py-6 lg:px-10 lg:py-8">
              <div className="mx-auto max-w-5xl">
                <Suspense
                  fallback={<p className="text-sm text-slate-500">Loading...</p>}
                >
                  {children}
                </Suspense>
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
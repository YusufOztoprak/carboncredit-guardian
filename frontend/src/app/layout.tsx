import { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NetworkBanner from "@/components/NetworkBanner";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "CarbonCredit Guardian",
  description: "Verified, single-use carbon credits",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Providers>
          <NetworkBanner />
          <Suspense
            fallback={
              <div className="h-14 border-b border-slate-200 bg-white" />
            }
          >
            <Nav />
          </Suspense>
          <main className="mx-auto max-w-5xl px-4 py-8">
            <Suspense
              fallback={<p className="text-sm text-slate-600">Loading...</p>}
            >
              {children}
            </Suspense>
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

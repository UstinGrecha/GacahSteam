import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { AppProviders } from "@/app/providers";
import { SITE_BRAND } from "@/lib/siteBrand";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: SITE_BRAND,
  description:
    "Unofficial fan card packs from public PC game store listings. Not affiliated with Valve Corporation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 font-sans text-zinc-100">
        <AppProviders>
          <NavBar />
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
            {children}
          </div>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}

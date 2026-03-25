import { NavBar } from "@/components/NavBar";
import { SiteFooter } from "@/components/SiteFooter";
import { AppProviders } from "@/app/providers";
import { SITE_BRAND } from "@/lib/siteBrand";
import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
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
      <body className="flex min-h-dvh flex-col overflow-x-clip bg-zinc-950 font-sans text-zinc-100 antialiased [touch-action:manipulation]">
        <AppProviders>
          <NavBar />
          <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-3 py-6 sm:px-4 sm:py-8">
            {children}
          </div>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}

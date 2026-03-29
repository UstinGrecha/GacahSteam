import { RaidView } from "@/app/raid/RaidView";
import { SITE_BRAND } from "@/lib/siteBrand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Weekly raid — ${SITE_BRAND}`,
  description:
    "Turn-based weekly raid boss: pick five cards from your collection and fight.",
};

export default function RaidPage() {
  return <RaidView />;
}

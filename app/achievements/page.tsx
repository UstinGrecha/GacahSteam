import { AchievementsView } from "./AchievementsView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Достижения — SteamGacha",
};

export default function AchievementsPage() {
  return <AchievementsView />;
}

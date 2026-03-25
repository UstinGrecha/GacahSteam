import { AchievementsView } from "./AchievementsView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Achievements — GameGacha",
};

export default function AchievementsPage() {
  return <AchievementsView />;
}

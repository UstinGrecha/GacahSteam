import { CollectionView } from "./CollectionView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Коллекция — SteamGacha",
};

export default function CollectionPage() {
  return <CollectionView />;
}

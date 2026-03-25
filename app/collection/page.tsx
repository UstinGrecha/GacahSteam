import { CollectionView } from "./CollectionView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collection — GameGacha",
};

export default function CollectionPage() {
  return <CollectionView />;
}

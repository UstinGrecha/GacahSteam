import { auth } from "@/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = {
  title: "Profile — GameGacha",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }
  return <ProfileView />;
}

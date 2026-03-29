import { auth } from "@/auth";
import { serverGetMyActiveListings } from "@/lib/server/market";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "no_database" }, { status: 503 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const items = await serverGetMyActiveListings(userId);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}

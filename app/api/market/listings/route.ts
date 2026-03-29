import { serverGetMarketListings } from "@/lib/server/market";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "no_database" }, { status: 503 });
  }
  try {
    const { items } = await serverGetMarketListings();
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "list_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

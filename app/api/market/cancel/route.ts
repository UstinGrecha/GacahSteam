import { auth } from "@/auth";
import { serverCancelMarketListing } from "@/lib/server/market";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "no_database" }, { status: 503 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const listingId = (body as { listingId?: unknown }).listingId;
  if (typeof listingId !== "string" || !listingId.trim()) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await serverCancelMarketListing(userId, listingId.trim());
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 404 });
  }
  return NextResponse.json({ state: result.state });
}

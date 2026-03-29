import { auth } from "@/auth";
import { serverCreateMarketListing } from "@/lib/server/market";
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
  const o = body as Record<string, unknown>;
  const pullId = typeof o.pullId === "string" ? o.pullId.trim() : "";
  const slotIndex = Number(o.slotIndex);
  const priceCoins = Number(o.priceCoins);

  if (!pullId || !Number.isInteger(slotIndex) || slotIndex < 0) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await serverCreateMarketListing(
    userId,
    pullId,
    slotIndex,
    priceCoins,
  );
  if (!result.ok) {
    const status =
      result.code === "pull_not_found" || result.code === "invalid_slot"
        ? 400
        : result.code === "too_many_listings"
          ? 409
          : 400;
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status },
    );
  }
  return NextResponse.json({
    state: result.state,
    listingId: result.listingId,
  });
}

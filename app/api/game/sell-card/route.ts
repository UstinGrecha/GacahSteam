import { auth } from "@/auth";
import { serverSellCard } from "@/lib/server/onlineGame";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const pullId = (body as { pullId?: unknown }).pullId;
  const slotIndex = Number((body as { slotIndex?: unknown }).slotIndex);
  if (typeof pullId !== "string" || !pullId.trim()) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!Number.isInteger(slotIndex) || slotIndex < 0) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await serverSellCard(userId, pullId.trim(), slotIndex);
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 400 });
  }
  return NextResponse.json({
    state: result.state,
    coinsGained: result.coinsGained,
  });
}

import { auth } from "@/auth";
import { serverClaimRaidBossReward } from "@/lib/server/onlineGame";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isWeekKey(x: unknown): x is string {
  return typeof x === "string" && /^\d{4}-W\d{2}$/.test(x);
}

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
  const weekKey = (body as { weekKey?: unknown }).weekKey;
  if (!isWeekKey(weekKey)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await serverClaimRaidBossReward(userId, weekKey);
  if (!result.ok) {
    const status =
      result.code === "already_claimed"
        ? 409
        : result.code === "week_mismatch"
          ? 400
          : result.code === "pool_missing"
            ? 503
            : 400;
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status },
    );
  }
  return NextResponse.json({
    state: result.state,
    card: result.card,
    pullId: result.pullId,
  });
}

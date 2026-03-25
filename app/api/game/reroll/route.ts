import { auth } from "@/auth";
import { serverRerollSlot } from "@/lib/server/onlineGame";
import type { PackKind } from "@/lib/gacha/packKinds";
import type { CardSeries } from "@/lib/gacha/steamPools";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KINDS: PackKind[] = ["standard", "budget", "premium"];

function isPackKind(x: unknown): x is PackKind {
  return typeof x === "string" && KINDS.includes(x as PackKind);
}

function isSeries(x: unknown): x is CardSeries {
  return x === 1 || x === 2;
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
  const o = body as Record<string, unknown>;
  const pullId = typeof o.pullId === "string" ? o.pullId : "";
  if (!pullId || !isPackKind(o.packKind) || !isSeries(o.series)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await serverRerollSlot(userId, pullId, o.series, o.packKind);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.code, message: result.message },
      { status: 400 },
    );
  }
  return NextResponse.json({ state: result.state, cards: result.cards });
}

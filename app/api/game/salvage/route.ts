import { auth } from "@/auth";
import { serverSalvage } from "@/lib/server/onlineGame";
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
  const appid = Number((body as { appid?: unknown }).appid);
  if (!Number.isFinite(appid) || appid <= 0) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await serverSalvage(userId, Math.floor(appid));
  if (!result.ok) {
    return NextResponse.json({ error: result.code }, { status: 400 });
  }
  return NextResponse.json({ state: result.state });
}

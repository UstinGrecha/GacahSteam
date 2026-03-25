import { getStrongestCardLeaderboard } from "@/lib/server/cardStrengthLeaderboard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "no_database" }, { status: 503 });
  }
  try {
    const entries = await getStrongestCardLeaderboard(10);
    return NextResponse.json({ entries });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

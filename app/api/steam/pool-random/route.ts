import { NextRequest, NextResponse } from "next/server";
import type { CardSeries } from "@/lib/gacha/steamPools";
import { pickRandomSteamPoolAppIds } from "@/lib/steam/steamPoolDb";
import { MERGED_APP_DETAILS_IDS_CAP } from "@/lib/steam/mergedAppDetails";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

function parseSeries(raw: string | null): CardSeries | null {
  if (raw === "1") return 1;
  if (raw === "2") return 2;
  return null;
}

export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: "no_database" }, { status: 503 });
  }

  const series = parseSeries(req.nextUrl.searchParams.get("series"));
  if (series == null) {
    return NextResponse.json(
      { error: "series query required (1 or 2)" },
      { status: 400 },
    );
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "40");
  const limit = Math.min(
    MERGED_APP_DETAILS_IDS_CAP,
    Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 40),
  );

  const excludeRaw = req.nextUrl.searchParams.get("exclude") ?? "";
  const exclude = new Set<number>();
  for (const part of excludeRaw.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) exclude.add(n);
  }

  try {
    const appids = await pickRandomSteamPoolAppIds(series, exclude, limit);
    return NextResponse.json({ appids });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pool_random_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

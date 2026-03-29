import { NextRequest, NextResponse } from "next/server";
import type { CardSeries } from "@/lib/gacha/steamPools";
import { fetchSteamPoolResponseForIds } from "@/lib/steam/steamPoolDb";
import { MERGED_APP_DETAILS_IDS_CAP } from "@/lib/steam/mergedAppDetails";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

function parseSeries(raw: string | null): CardSeries | null {
  if (raw === "1") return 1;
  if (raw === "2") return 2;
  return null;
}

export async function GET(req: NextRequest) {
  const series = parseSeries(req.nextUrl.searchParams.get("series"));
  if (series == null) {
    return NextResponse.json(
      { error: "series query required (1 or 2)" },
      { status: 400 },
    );
  }

  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, MERGED_APP_DETAILS_IDS_CAP);

  if (!ids.length) {
    return NextResponse.json({ error: "ids query required" }, { status: 400 });
  }

  try {
    const merged = await fetchSteamPoolResponseForIds(ids, series);
    return NextResponse.json(merged, {
      headers: {
        "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "pool query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  fetchMergedSteamDetails,
  MERGED_APP_DETAILS_IDS_CAP,
} from "@/lib/steam/mergedAppDetails";

export const dynamic = "force-dynamic";

/** На Vercel / аналогах увеличивает лимит времени функции (см. документацию хостинга). */
export const maxDuration = 60;

export async function GET(req: NextRequest) {
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
    const merged = await fetchMergedSteamDetails(ids);
    const uniqFailures =
      merged._meta &&
      typeof merged._meta === "object" &&
      "failedAppIds" in merged._meta &&
      Array.isArray((merged._meta as { failedAppIds: unknown }).failedAppIds)
        ? (merged._meta as { failedAppIds: number[] }).failedAppIds
        : [];

    if (uniqFailures.length) {
      return NextResponse.json(merged, {
        headers: {
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }

    return NextResponse.json(merged, {
      headers: {
        "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Steam request failed";
    const sample = [...new Set(ids)].slice(0, 3).join(", ");
    return NextResponse.json(
      {
        error: "Steam request failed",
        status: 502,
        statusText: "No app data",
        detail: `${msg} Примеры appid: ${sample}.`,
      },
      { status: 502 },
    );
  }
}

import type { Rarity, SteamCard } from "@/lib/gacha/types";

const RARITIES = new Set<Rarity>([
  "common",
  "uncommon",
  "rare",
  "epic",
  "holo",
  "legend",
]);

function asRarity(x: unknown): Rarity {
  return typeof x === "string" && RARITIES.has(x as Rarity)
    ? (x as Rarity)
    : "common";
}

/**
 * Собирает SteamCard из сырого объекта сохранения (без нормализации pulls).
 * Возвращает null, если нет валидного appid.
 */
export function steamCardFromLeaderboardRaw(
  o: Record<string, unknown>,
): SteamCard | null {
  const appid =
    typeof o.appid === "number" && Number.isFinite(o.appid)
      ? Math.floor(o.appid)
      : Math.floor(Number(o.appid));
  if (!Number.isFinite(appid) || appid <= 0) return null;

  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "?";
  const atk =
    typeof o.atk === "number" && Number.isFinite(o.atk) ? o.atk : Number(o.atk) || 0;
  const def =
    typeof o.def === "number" && Number.isFinite(o.def) ? o.def : Number(o.def) || 0;
  const hp =
    typeof o.hp === "number" && Number.isFinite(o.hp) ? o.hp : Number(o.hp) || 0;

  const headerImage =
    typeof o.headerImage === "string" && o.headerImage.trim()
      ? o.headerImage.trim()
      : `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
  const storeUrl =
    typeof o.storeUrl === "string" && o.storeUrl.startsWith("http")
      ? o.storeUrl
      : `https://store.steampowered.com/app/${appid}/`;

  return {
    appid,
    name,
    headerImage,
    storeUrl,
    rarity: asRarity(o.rarity),
    atk,
    def,
    hp,
    score:
      typeof o.score === "number" && Number.isFinite(o.score) ? o.score : 0,
    positivePercent:
      typeof o.positivePercent === "number" && Number.isFinite(o.positivePercent)
        ? o.positivePercent
        : 0,
    metacritic:
      typeof o.metacritic === "number" && Number.isFinite(o.metacritic)
        ? o.metacritic
        : null,
    hasUserReviews:
      typeof o.hasUserReviews === "boolean" ? o.hasUserReviews : false,
    reviewCount:
      typeof o.reviewCount === "number" && Number.isFinite(o.reviewCount)
        ? Math.trunc(o.reviewCount)
        : -1,
    releaseDateMs:
      typeof o.releaseDateMs === "number" && Number.isFinite(o.releaseDateMs)
        ? o.releaseDateMs
        : null,
    reviewScoreDesc:
      typeof o.reviewScoreDesc === "string" && o.reviewScoreDesc.trim()
        ? o.reviewScoreDesc.trim()
        : null,
    genres: Array.isArray(o.genres)
      ? o.genres.filter((g): g is string => typeof g === "string")
      : [],
  };
}

/**
 * Fill data/steam-app-ids.json with real Steam game appids.
 * Source: community list (jsnli/steamappidlist) — Steam's public GetAppList often 404s from servers.
 * Run: node scripts/fetch-app-ids.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "data", "steam-app-ids.json");

const MAX_IDS = 10_000;
const GAMES_JSON_URL =
  "https://raw.githubusercontent.com/jsnli/steamappidlist/master/data/games_appid.json";

async function main() {
  const res = await fetch(GAMES_JSON_URL, {
    headers: { "User-Agent": "GameGachaFetcher/1.0" },
  });
  if (!res.ok) throw new Error(`games_appid.json fetch failed: ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Expected JSON array");

  const step = Math.max(1, Math.floor(data.length / MAX_IDS));
  const sampled = [];
  for (
    let i = 0;
    i < data.length && sampled.length < MAX_IDS;
    i += step
  ) {
    const id = data[i]?.appid;
    if (typeof id === "number" && id > 0) sampled.push(id);
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(sampled, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${sampled.length} appids (step=${step}, source games=${data.length}) to ${outPath}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

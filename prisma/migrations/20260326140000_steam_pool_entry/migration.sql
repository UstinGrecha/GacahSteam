-- CreateTable
CREATE TABLE "SteamPoolEntry" (
    "appid" INTEGER NOT NULL PRIMARY KEY,
    "series" INTEGER NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SteamPoolEntry_series_idx" ON "SteamPoolEntry"("series");

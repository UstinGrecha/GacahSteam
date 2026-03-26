-- CreateTable
CREATE TABLE "SteamAppDetailsCache" (
    "appid" INTEGER NOT NULL PRIMARY KEY,
    "payloadJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

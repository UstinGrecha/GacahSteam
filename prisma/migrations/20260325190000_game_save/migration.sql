-- CreateTable
CREATE TABLE "GameSave" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSave_userId_key" ON "GameSave"("userId");

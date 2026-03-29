import { PrismaClient } from "@prisma/client";

/**
 * Локально без скопированного `.env` — как в `.env.example` (SQLite).
 * В production переменная обязательна.
 */
if (
  process.env.NODE_ENV !== "production" &&
  !process.env.DATABASE_URL?.trim()
) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function prismaClientIsCurrent(client: PrismaClient): boolean {
  const d = client as unknown as {
    marketListing?: { findMany?: unknown };
    authenticator?: { findMany?: unknown };
  };
  return (
    typeof d.marketListing?.findMany === "function" &&
    typeof d.authenticator?.findMany === "function"
  );
}

/**
 * Ленивая инициализация PrismaClient.
 */
export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }
  const existing = globalForPrisma.prisma;
  if (existing && !prismaClientIsCurrent(existing)) {
    void existing.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

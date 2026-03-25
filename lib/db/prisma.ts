import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Ленивая инициализация: при сборке без DATABASE_URL модуль не падает.
 */
export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

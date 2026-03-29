import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const n = await p.steamPoolEntry.count({ where: { series: 1 } });
await p.$disconnect();
console.log(`Серия 1: ${n} из 10000`);

import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabasePoolConfig } from "./config";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export function getPrismaClient() {
  const poolConfig = getDatabasePoolConfig();

  return (globalForPrisma.prisma ??= new PrismaClient({
    adapter: new PrismaPg(poolConfig),
  }));
}

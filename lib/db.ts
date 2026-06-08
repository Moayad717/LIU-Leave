import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function buildDatabaseUrl(): string {
  const base = process.env.DATABASE_URL!
  try {
    const url = new URL(base)
    // If already using Neon's pooler (pgbouncer=true), keep connection_limit=1 so
    // Prisma doesn't compete with PgBouncer's own pooling.
    // Otherwise (direct connection), cap at 3 to stay within Neon's free-tier limit.
    const isPgBouncer = url.searchParams.get("pgbouncer") === "true"
    url.searchParams.set("connection_limit", isPgBouncer ? "1" : "3")
    url.searchParams.set("pool_timeout", "30")
    return url.toString()
  } catch {
    return base
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: { db: { url: buildDatabaseUrl() } },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

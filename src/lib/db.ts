import { PrismaClient } from '@prisma/client'

/**
 * Schema version stamp. Bump this whenever the Prisma schema changes in a way
 * that requires a fresh PrismaClient instance (e.g. adding a new field).
 *
 * In Next.js dev mode, `lib/db.ts` is HMR-reloaded on file changes, but the
 * PrismaClient singleton stored on `globalThis` is NOT recreated — which means
 * a schema change won't take effect until the dev server is fully restarted.
 *
 * By comparing this stamp against the one stored on the cached instance, we
 * detect a schema mismatch and recreate the client in-place (disconnecting the
 * old one first). This avoids the need to manually restart the dev server
 * after every `prisma db push`.
 */
const PRISMA_SCHEMA_VERSION = 'v2-shareId-2026-07-27'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaSchemaVersion?: string
}

// If the cached PrismaClient was created with a different schema version,
// disconnect & discard it so a fresh client is built with the new schema.
if (
  globalForPrisma.prisma &&
  globalForPrisma.__prismaSchemaVersion !== PRISMA_SCHEMA_VERSION
) {
  // Fire-and-forget disconnect — don't block module load on cleanup.
  void globalForPrisma.prisma.$disconnect().catch(() => {})
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Em produção: só erros. Em dev: warnings + erros (sem flood de queries).
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.__prismaSchemaVersion = PRISMA_SCHEMA_VERSION
}
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function resolveDbUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.startsWith('file:')) {
      const filePath = process.env.DATABASE_URL.slice(5)
      if (path.isAbsolute(filePath)) {
        return process.env.DATABASE_URL
      }
      const resolved = path.resolve(/*turbopackIgnore: true*/ process.cwd(), filePath)
      if (fs.existsSync(/*turbopackIgnore: true*/ resolved)) {
        return `file:${resolved}`
      }
    } else {
      return process.env.DATABASE_URL
    }
  }

  const candidate = path.resolve(/*turbopackIgnore: true*/ process.cwd(), 'db', 'custom.db')
  if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
    return `file:${candidate}`
  }

  const fallback = path.resolve(/*turbopackIgnore: true*/ process.cwd(), '..', 'db', 'custom.db')
  if (fs.existsSync(/*turbopackIgnore: true*/ fallback)) {
    return `file:${fallback}`
  }

  return undefined
}

const resolvedUrl = resolveDbUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : {}),
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
#!/usr/bin/env tsx
import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'

import { aiAuditLogs } from '../lib/db/schema'

type BackupRecord = {
  id: number
  createdAt: string
}

type BackupFile = {
  capability?: string
  windowMinutes: number
  offsetHours: number
  savedAt: string
  rows: BackupRecord[]
}

function getArg(name: string, fallback?: string) {
  const prefix = `--${name}=`
  const direct = process.argv.find((arg) => arg.startsWith(prefix))
  if (direct) {
    return direct.slice(prefix.length)
  }

  const positional = process.argv.findIndex((arg) => arg === `--${name}`)
  if (positional !== -1 && positional + 1 < process.argv.length) {
    return process.argv[positional + 1]
  }

  return fallback
}

const backupPath = getArg('backup-file', '.cache/audit-drop-backup.json') ?? '.cache/audit-drop-backup.json'
const capabilityFilter = getArg('capability')

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL must be configured')
  }

  const absoluteBackupPath = path.resolve(backupPath)
  const raw = await fs.readFile(absoluteBackupPath, 'utf8')
  const parsed = JSON.parse(raw) as BackupFile

  if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
    console.warn('[restore-audit-backup] backup file contains no rows; nothing to restore')
    return
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    let restored = 0
    for (const row of parsed.rows) {
      if (!row?.id || !row?.createdAt) {
        continue
      }
      const createdAt = new Date(row.createdAt)
      if (Number.isNaN(createdAt.getTime())) {
        console.warn('[restore-audit-backup] skipping record with invalid timestamp', row)
        continue
      }

      if (capabilityFilter) {
        await db
          .update(aiAuditLogs)
          .set({ createdAt })
          .where(eq(aiAuditLogs.id, row.id))
          .where(eq(aiAuditLogs.capability, capabilityFilter))
      } else {
        await db.update(aiAuditLogs).set({ createdAt }).where(eq(aiAuditLogs.id, row.id))
      }
      restored += 1
    }

    console.log('[restore-audit-backup] restore complete', {
      restored,
      capabilityFilter: capabilityFilter ?? parsed.capability,
      backupPath: absoluteBackupPath
    })
  } finally {
    await db.$client.end()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('[restore-audit-backup] failed', error)
  process.exitCode = 1
})

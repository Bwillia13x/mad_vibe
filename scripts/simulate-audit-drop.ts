#!/usr/bin/env tsx
import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq, gt } from 'drizzle-orm'
import { Pool } from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'

import { aiAuditLogs } from '../lib/db/schema'

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

function ensurePositiveNumber(value: string | undefined, label: string, fallback: number): number {
  if (value === undefined) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`)
  }

  return parsed
}

const capability = getArg('capability', 'synthetic_drop_test') ?? 'synthetic_drop_test'
const windowMinutes = ensurePositiveNumber(getArg('window-minutes', '60'), '--window-minutes', 60)
const offsetHours = ensurePositiveNumber(getArg('offset-hours', '24'), '--offset-hours', 24)
const backupPath = getArg('backup-file', '.cache/audit-drop-backup.json') ?? '.cache/audit-drop-backup.json'

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL must be configured')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
    const rows = await db
      .select()
      .from(aiAuditLogs)
      .where(
        and(eq(aiAuditLogs.capability, capability), gt(aiAuditLogs.createdAt, windowStart))
      )

    if (rows.length === 0) {
      console.warn('[simulate-audit-drop] no records found in window; nothing to adjust')
      return
    }

    await fs.mkdir(path.dirname(backupPath), { recursive: true })
    await fs.writeFile(
      backupPath,
      JSON.stringify(
        {
          capability,
          windowMinutes,
          offsetHours,
          savedAt: new Date().toISOString(),
          rows: rows.map((row) => ({ id: row.id, createdAt: row.createdAt.toISOString() }))
        },
        null,
        2
      ),
      'utf8'
    )

    const offsetMs = offsetHours * 60 * 60 * 1000

    for (const row of rows) {
      const newTimestamp = new Date(row.createdAt.getTime() - offsetMs)
      await db.update(aiAuditLogs).set({ createdAt: newTimestamp }).where(eq(aiAuditLogs.id, row.id))
    }

    console.log('[simulate-audit-drop] adjusted records', {
      capability,
      updated: rows.length,
      windowMinutes,
      offsetHours,
      backupPath
    })
    console.log('[simulate-audit-drop] run `npm run sync:ai-audit-logs` to propagate drop scenario to warehouse')
    console.log('[simulate-audit-drop] restore timestamps with `tsx scripts/restore-audit-backup.ts --backup-file', backupPath, ' --capability', capability, '`')
  } finally {
    await db.$client.end()
    await pool.end()
  }
}

main().catch((error) => {
  console.error('[simulate-audit-drop] failed', error)
  process.exitCode = 1
})

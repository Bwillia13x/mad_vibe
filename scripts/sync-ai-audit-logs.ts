import 'dotenv/config'

import { drizzle } from 'drizzle-orm/node-postgres'
import { inArray, gt, and } from 'drizzle-orm'
import { Pool } from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'

import { BigQuery } from '@google-cloud/bigquery'

import { aiAuditLogs, workspaceDataSnapshots, marketSnapshots } from '../lib/db/schema'

interface SyncState {
  lastCreatedAt: string | null
}

type SyncMode = 'delta' | 'full'

interface CliOptions {
  mode: SyncMode
  since?: Date | null
  lookbackMs?: number
  batchSize?: number
}

type WarehouseAuditRow = {
  id: number
  workflowId: number
  capability: string | null
  provider: string
  createdAt: string
  prompt: unknown
  response: unknown
  verification: unknown
}

type WarehouseWorkspaceSnapshotRow = {
  id: number
  workflowId: number
  snapshotType: string
  marketSnapshotId: number | null
  createdAt: string
  data: unknown
  metadata: unknown
}

type WarehouseMarketSnapshotRow = {
  id: number
  ticker: string
  provider: string
  capturedAt: string
  rawPayload: unknown
  normalizedMetrics: unknown
  sourceMetadata: unknown
}

interface WarehouseClient {
  upsertAuditLogs: (payload: WarehouseAuditRow[]) => Promise<void>
  upsertWorkspaceSnapshots: (payload: WarehouseWorkspaceSnapshotRow[]) => Promise<void>
  upsertMarketSnapshots: (payload: WarehouseMarketSnapshotRow[]) => Promise<void>
}

const STATE_FILE = path.resolve(
  process.env.AI_AUDIT_SYNC_STATE_PATH ?? '.cache/ai-audit-sync-state.json'
)

function getArgValue(name: string): string | undefined {
  const prefix = `--${name}=`
  const direct = process.argv.find((arg) => arg.startsWith(prefix))
  if (direct) {
    return direct.slice(prefix.length)
  }

  const index = process.argv.findIndex((arg) => arg === `--${name}`)
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1]
  }

  return undefined
}

function parsePositiveNumber(value: string | undefined, fallback?: number): number | undefined {
  if (value === undefined) {
    return fallback
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric value: ${value}`)
  }

  return parsed
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value for --since: ${value}`)
  }

  return parsed
}

function parseDurationMs(value: string | undefined, fallbackMs: number): number {
  if (!value) {
    return fallbackMs
  }

  const match = value.trim().match(/^([0-9]+)([smhd])$/i)
  if (!match) {
    throw new Error(`Invalid duration format: ${value}. Use formats like 15m, 2h, 1d`)
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()

  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  }

  return amount * unitMs[unit]
}

function parseCliOptions(): CliOptions {
  const modeValue = (getArgValue('mode') ?? 'delta').toLowerCase()
  if (modeValue !== 'delta' && modeValue !== 'full') {
    throw new Error(`Unsupported mode: ${modeValue}. Expected 'delta' or 'full'`)
  }

  const since = parseDate(getArgValue('since')) ?? null
  const lookbackMs = parseDurationMs(getArgValue('lookback'), 24 * 60 * 60 * 1000)
  const batchSize = parsePositiveNumber(getArgValue('batch-size'))

  return {
    mode: modeValue,
    since,
    lookbackMs,
    batchSize
  }
}

async function loadSyncState(): Promise<SyncState> {
  try {
    const contents = await fs.readFile(STATE_FILE, 'utf8')
    return JSON.parse(contents) as SyncState
  } catch {
    return { lastCreatedAt: null }
  }
}

async function persistSyncState(state: SyncState) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true })
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

async function loadBigQueryCredentials(): Promise<Record<string, unknown>> {
  const raw = process.env.AI_AUDIT_BQ_CREDENTIALS
  if (!raw) {
    throw new Error('AI_AUDIT_BQ_CREDENTIALS not configured')
  }

  if (raw.trim().startsWith('{')) {
    return JSON.parse(raw) as Record<string, unknown>
  }

  const credentialPath = path.resolve(raw)
  const contents = await fs.readFile(credentialPath, 'utf8')
  return JSON.parse(contents) as Record<string, unknown>
}

async function buildWarehouseClient(): Promise<WarehouseClient> {
  const destination = process.env.AI_AUDIT_WAREHOUSE_DESTINATION
  if (!destination) {
    throw new Error('AI_AUDIT_WAREHOUSE_DESTINATION not configured')
  }

  const transport = destination.toLowerCase()

  if (transport === 'stdout') {
    return {
      async upsertAuditLogs(rows) {
        console.log('[sync-ai-audit-logs] audit logs batch', JSON.stringify(rows))
      },
      async upsertWorkspaceSnapshots(rows) {
        console.log('[sync-ai-audit-logs] workspace snapshots batch', JSON.stringify(rows))
      },
      async upsertMarketSnapshots(rows) {
        console.log('[sync-ai-audit-logs] market snapshots batch', JSON.stringify(rows))
      }
    }
  }

  if (transport === 'bigquery') {
    const projectId = process.env.AI_AUDIT_BQ_PROJECT
    if (!projectId) {
      throw new Error('AI_AUDIT_BQ_PROJECT must be configured for BigQuery transport')
    }

    const credentials = await loadBigQueryCredentials()
    const datasetId = process.env.AI_AUDIT_BQ_DATASET ?? 'analytics'
    const auditTableId = process.env.AI_AUDIT_BQ_AUDIT_TABLE ?? 'raw_ai_audit_logs'
    const workspaceTableId = process.env.AI_AUDIT_BQ_WORKSPACE_TABLE ?? 'raw_workspace_snapshots'
    const marketTableId = process.env.AI_AUDIT_BQ_MARKET_TABLE ?? 'raw_market_snapshots'

    const bigquery = new BigQuery({ projectId, credentials })
    const dataset = bigquery.dataset(datasetId)

    const insertRows = async <T>(
      tableId: string,
      rows: T[],
      selectInsertId: (row: T) => string
    ) => {
      if (rows.length === 0) {
        return
      }

      const table = dataset.table(tableId)
      const payload = rows.map((row) => ({
        insertId: selectInsertId(row),
        json: row as Record<string, unknown>
      }))

      try {
        await table.insert(payload, { ignoreUnknownValues: true })
      } catch (error) {
        if (Array.isArray((error as { errors?: unknown[] }).errors)) {
          console.error('[sync-ai-audit-logs] bigquery partial failure', {
            tableId,
            errors: (error as { errors: unknown[] }).errors
          })
        }

        throw error
      }
    }

    return {
      async upsertAuditLogs(rows) {
        await insertRows(auditTableId, rows, (row) => row.id.toString())
      },
      async upsertWorkspaceSnapshots(rows) {
        await insertRows(workspaceTableId, rows, (row) => row.id.toString())
      },
      async upsertMarketSnapshots(rows) {
        await insertRows(marketTableId, rows, (row) => row.id.toString())
      }
    }
  }

  throw new Error(`Unsupported warehouse destination: ${destination}`)
}

async function run() {
  const cli = parseCliOptions()
  const state = await loadSyncState()
  const warehouse = await buildWarehouseClient()

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL must be configured')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const db = drizzle(pool)

  try {
    const batchSize = cli.batchSize ?? Number(process.env.AI_AUDIT_SYNC_BATCH_SIZE ?? '500')

    let createdAtCursor: Date | null = null
    if (cli.mode === 'full') {
      if (cli.since) {
        createdAtCursor = cli.since
      } else if (cli.lookbackMs) {
        createdAtCursor = new Date(Date.now() - cli.lookbackMs)
      }
    } else {
      if (cli.since) {
        createdAtCursor = cli.since
      } else if (state.lastCreatedAt) {
        createdAtCursor = new Date(state.lastCreatedAt)
      }
    }

    console.log('[sync-ai-audit-logs] starting', {
      mode: cli.mode,
      batchSize,
      createdAtCursor: createdAtCursor?.toISOString() ?? null
    })

    const auditRows = await db
      .select()
      .from(aiAuditLogs)
      .where(createdAtCursor ? gt(aiAuditLogs.createdAt, createdAtCursor) : undefined)
      .orderBy(aiAuditLogs.createdAt)
      .limit(batchSize)

    if (auditRows.length === 0) {
      console.log('[sync-ai-audit-logs] no new audit logs to sync')
      return
    }

    const workflowIds = Array.from(new Set<number>(auditRows.map((row) => row.workflowId)))

    const workspaceSnapshotsRows = workflowIds.length
      ? await db
          .select()
          .from(workspaceDataSnapshots)
          .where(
            createdAtCursor
              ? and(
                  inArray(workspaceDataSnapshots.workflowId, workflowIds),
                  gt(workspaceDataSnapshots.createdAt, createdAtCursor)
                )
              : inArray(workspaceDataSnapshots.workflowId, workflowIds)
          )
          .limit(batchSize)
      : []

    const marketSnapshotIds = Array.from(
      new Set<number>(
        workspaceSnapshotsRows
          .map((row) => row.marketSnapshotId)
          .filter((id): id is number => typeof id === 'number')
      )
    )

    const marketSnapshotRows = marketSnapshotIds.length
      ? await db
          .select()
          .from(marketSnapshots)
          .where(inArray(marketSnapshots.id, marketSnapshotIds))
      : []

    await warehouse.upsertAuditLogs(
      auditRows.map((row) => ({
        id: row.id,
        workflowId: row.workflowId,
        capability: row.capability,
        provider: row.provider,
        createdAt: row.createdAt.toISOString(),
        prompt: row.prompt,
        response: row.response,
        verification: row.verification
      }))
    )

    if (workspaceSnapshotsRows.length > 0) {
      await warehouse.upsertWorkspaceSnapshots(
        workspaceSnapshotsRows.map((row) => ({
          id: row.id,
          workflowId: row.workflowId,
          snapshotType: row.snapshotType,
          marketSnapshotId: row.marketSnapshotId,
          createdAt: row.createdAt.toISOString(),
          data: row.data,
          metadata: row.metadata
        }))
      )
    }

    if (marketSnapshotRows.length > 0) {
      await warehouse.upsertMarketSnapshots(
        marketSnapshotRows.map((row) => ({
          id: row.id,
          ticker: row.ticker,
          provider: row.provider,
          capturedAt: row.capturedAt.toISOString(),
          rawPayload: row.rawPayload,
          normalizedMetrics: row.normalizedMetrics,
          sourceMetadata: row.sourceMetadata
        }))
      )
    }

    const newState: SyncState = {
      lastCreatedAt: auditRows[auditRows.length - 1]?.createdAt.toISOString() ?? state.lastCreatedAt
    }

    await persistSyncState(newState)
    console.log('[sync-ai-audit-logs] synced', {
      auditCount: auditRows.length,
      workspaceSnapshots: workspaceSnapshotsRows.length,
      marketSnapshots: marketSnapshotRows.length,
      lastCreatedAt: newState.lastCreatedAt
    })
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error('[sync-ai-audit-logs] sync failed', error)
  process.exitCode = 1
})

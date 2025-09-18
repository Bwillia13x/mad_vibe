import { describe, it, expect, vi, afterEach } from 'vitest'

const resolveEnv = (databaseUrl?: string) =>
  vi.fn((key: string) => {
    if (key === 'DATABASE_URL') return databaseUrl
    return undefined
  })

describe('MemStorage research log seeding', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('skips database seeding when DATABASE_URL is missing', async () => {
    const deleteMock = vi.fn()
    const valuesMock = vi.fn()
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock })

    vi.doMock('../../../lib/db', () => ({
      db: {
        delete: deleteMock,
        insert: insertMock
      }
    }))

    vi.doMock('../../../lib/env-security', () => ({
      getEnvVar: resolveEnv(undefined)
    }))

    const { MemStorage } = await import('../../../server/storage')
    const storage = new MemStorage()

    await storage.seedDemoData('default', 42)

    expect(deleteMock).not.toHaveBeenCalled()
    expect(valuesMock).not.toHaveBeenCalled()
  })

  it('writes demo research log entries when DATABASE_URL is set', async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined)
    let insertedRows: any[] | undefined
    const valuesMock = vi.fn().mockImplementation(async (rows: any[]) => {
      insertedRows = rows
    })
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock })

    vi.doMock('../../../lib/db', () => ({
      db: {
        delete: deleteMock,
        insert: insertMock
      }
    }))

    vi.doMock('../../../lib/env-security', () => ({
      getEnvVar: resolveEnv('postgres://local/test')
    }))

    const { MemStorage } = await import('../../../server/storage')
    const storage = new MemStorage()

    await storage.seedDemoData('default', 99)

    expect(deleteMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(valuesMock).toHaveBeenCalledTimes(1)
    expect(insertedRows).toBeTruthy()
    expect(insertedRows?.length).toBeGreaterThanOrEqual(4)
    insertedRows?.forEach((row) => {
      expect(row.stageSlug).toBeTruthy()
      expect(row.stageTitle).toBeTruthy()
      expect(row.action).toBeTruthy()
      expect(row.timestamp).toBeInstanceOf(Date)
    })
  })
})

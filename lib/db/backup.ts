import { exec } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { log } from '../log'
import { getEnvVar } from '../env-security'

const BACKUP_DIR = join(process.cwd(), 'backups')

interface BackupInfo {
  filename: string
  size: number
  created: Date
}

export async function createBackup(): Promise<string> {
  try {
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.sql`
    const filepath = join(BACKUP_DIR, filename)

    const databaseUrl = getEnvVar('POSTGRES_URL') || getEnvVar('DATABASE_URL')
    if (!databaseUrl) {
      throw new Error('Database URL not configured')
    }

    // Extract database name from URL for pg_dump
    const dbName = new URL(databaseUrl).pathname.slice(1)

    return new Promise((resolve, reject) => {
      const command = `pg_dump "${databaseUrl}" > "${filepath}"`

      exec(command, (error, stdout, stderr) => {
        if (error) {
          log('Backup creation failed', { error: error.message })
          reject(error)
          return
        }

        if (stderr) {
          log('Backup warning', { warning: stderr })
        }

        log('Backup created successfully', { filename, filepath })
        resolve(filename)
      })
    })
  } catch (error) {
    log('Backup creation error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

export async function listBackups(): Promise<BackupInfo[]> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true })

    const files = await fs.readdir(BACKUP_DIR)
    const backups: BackupInfo[] = []

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filepath = join(BACKUP_DIR, file)
        const stats = await fs.stat(filepath)

        backups.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime
        })
      }
    }

    return backups.sort((a, b) => b.created.getTime() - a.created.getTime())
  } catch (error) {
    log('Failed to list backups', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

export async function scheduleBackup(): Promise<void> {
  // In a real implementation, this would set up a cron job or scheduled task
  log('Backup scheduling not implemented', {
    note: 'Use cron or a task scheduler to run: pnpm db:backup'
  })

  // For demo purposes, just create a backup now
  await createBackup()
}

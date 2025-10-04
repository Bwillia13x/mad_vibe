/**
 * Workspace Caching Layer
 * Reduces database load for frequently accessed workspace data
 */

import { redis } from './redis-client'
import { log } from '../log'

const CACHE_TTL = 300 // 5 minutes

export async function getCachedWorkspace(workspaceId: number): Promise<any | null> {
  if (!redis.isEnabled()) {
    return null
  }

  try {
    const key = `workspace:${workspaceId}`
    const cached = await redis.get(key)
    
    if (cached) {
      log('Workspace cache hit', { workspaceId })
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    log('Workspace cache get error', { 
      workspaceId, 
      error: error instanceof Error ? error.message : String(error) 
    })
    return null
  }
}

export async function setCachedWorkspace(workspaceId: number, data: any): Promise<void> {
  if (!redis.isEnabled()) {
    return
  }

  try {
    const key = `workspace:${workspaceId}`
    await redis.set(key, JSON.stringify(data), CACHE_TTL)
    log('Workspace cached', { workspaceId, ttl: CACHE_TTL })
  } catch (error) {
    log('Workspace cache set error', { 
      workspaceId, 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
}

export async function invalidateWorkspaceCache(workspaceId: number): Promise<void> {
  if (!redis.isEnabled()) {
    return
  }

  try {
    const key = `workspace:${workspaceId}`
    await redis.del(key)
    log('Workspace cache invalidated', { workspaceId })
  } catch (error) {
    log('Workspace cache invalidation error', { 
      workspaceId, 
      error: error instanceof Error ? error.message : String(error) 
    })
  }
}

export async function getCachedWorkspaceSnapshots(workspaceId: number): Promise<any[] | null> {
  if (!redis.isEnabled()) {
    return null
  }

  try {
    const key = `workspace:${workspaceId}:snapshots`
    const cached = await redis.get(key)
    
    if (cached) {
      log('Workspace snapshots cache hit', { workspaceId })
      return JSON.parse(cached)
    }
    
    return null
  } catch (error) {
    return null
  }
}

export async function setCachedWorkspaceSnapshots(workspaceId: number, snapshots: any[]): Promise<void> {
  if (!redis.isEnabled()) {
    return
  }

  try {
    const key = `workspace:${workspaceId}:snapshots`
    await redis.set(key, JSON.stringify(snapshots), CACHE_TTL)
  } catch (error) {
    log('Workspace snapshots cache set error', { workspaceId })
  }
}

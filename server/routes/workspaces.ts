import { Router } from 'express'
import { desc, eq, and } from 'drizzle-orm'
import { log, logError } from '../../lib/log'
import { db } from '../../lib/db'
import {
  workflows,
  workflowArtifacts,
  workflowConversations,
  workspaceDataSnapshots
} from '../../lib/db/schema'
type WorkflowRow = typeof workflows.$inferSelect
type ArtifactRow = typeof workflowArtifacts.$inferSelect
type ConversationRow = typeof workflowConversations.$inferSelect
type WorkspaceSnapshotRow = typeof workspaceDataSnapshots.$inferSelect
import { optionalAuth } from '../middleware/auth'
import type {
  IdeaWorkspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceArtifact,
  CreateArtifactInput,
  ConversationMessage,
  CreateMessageInput,
  WorkspaceDataSnapshot
} from '@shared/types'

const router = Router()
router.use(optionalAuth)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.entries(value).reduce<Record<string, string>>((acc, [key, val]) => {
    acc[key] = typeof val === 'string' ? val : `${val ?? ''}`
    return acc
  }, {})
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function toWorkspaceSnapshot(row: WorkspaceSnapshotRow): WorkspaceDataSnapshot {
  return {
    id: row.id,
    workflowId: row.workflowId,
    snapshotType: row.snapshotType,
    marketSnapshotId: row.marketSnapshotId,
    financialStatementId: row.financialStatementId,
    artifactId: row.artifactId,
    data: asRecord(row.data),
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString()
  }
}

// Get all workspaces for current user (with filtering)
router.get('/workspaces', async (req, res) => {
  try {
    const { status = 'active', limit = 50 } = req.query
    const userId = 1 // TODO: Get from auth session

    const query = db
      .select()
      .from(workflows)
      .where(
        and(
          eq(workflows.userId, userId),
          status ? eq(workflows.status, status as string) : undefined
        )
      )
      .orderBy(desc(workflows.lastAccessedAt))
      .limit(Number(limit))

    const results = await query

    const workspaces: IdeaWorkspace[] = results.map((row: WorkflowRow) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      ticker: row.ticker,
      companyName: row.companyName,
      description: row.description,
      status: row.status as 'active' | 'archived' | 'completed',
      lastActiveStage: row.lastActiveStage || 'home',
      stageCompletions: asStringRecord(row.stageCompletions),
      settings: asRecord(row.settings),
      tags: asStringArray(row.tags),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastAccessedAt: row.lastAccessedAt.toISOString()
    }))

    res.json({ workspaces, count: workspaces.length })
  } catch (error) {
    logError('Failed to fetch workspaces', error as Error)
    res.status(500).json({ error: 'Failed to fetch workspaces' })
  }
})

// Workspace data snapshots (provenance + market refresh history)
router.get('/workspaces/:id/snapshots', async (req, res) => {
  try {
    const workspaceId = Number(req.params.id)
    if (Number.isNaN(workspaceId)) {
      return res.status(400).json({ error: 'Invalid workspace id' })
    }

    const snapshots = await db
      .select()
      .from(workspaceDataSnapshots)
      .where(eq(workspaceDataSnapshots.workflowId, workspaceId))
      .orderBy(desc(workspaceDataSnapshots.createdAt))
      .limit(50)

    const payload: WorkspaceDataSnapshot[] = snapshots.map(toWorkspaceSnapshot)
    res.json({ snapshots: payload, count: payload.length })
  } catch (error) {
    logError('Failed to fetch workspace snapshots', error as Error)
    res.status(500).json({ error: 'Failed to fetch workspace snapshots' })
  }
})

router.get('/workspaces/:id/snapshots/:snapshotId', async (req, res) => {
  try {
    const workspaceId = Number(req.params.id)
    const snapshotId = Number(req.params.snapshotId)

    if (Number.isNaN(workspaceId) || Number.isNaN(snapshotId)) {
      return res.status(400).json({ error: 'Invalid identifiers' })
    }

    const result = await db
      .select()
      .from(workspaceDataSnapshots)
      .where(eq(workspaceDataSnapshots.workflowId, workspaceId))
      .where(eq(workspaceDataSnapshots.id, snapshotId))
      .limit(1)

    if (result.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' })
    }

    res.json(toWorkspaceSnapshot(result[0]))
  } catch (error) {
    logError('Failed to fetch workspace snapshot detail', error as Error)
    res.status(500).json({ error: 'Failed to fetch snapshot detail' })
  }
})

// Get single workspace by ID
router.get('/workspaces/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const userId = 1 // TODO: Get from auth session

    const result = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, userId)))
      .limit(1)

    if (result.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    const row = result[0]
    const workspace: IdeaWorkspace = {
      id: row.id,
      userId: row.userId,
      name: row.name,
      ticker: row.ticker,
      companyName: row.companyName,
      description: row.description,
      status: row.status as 'active' | 'archived' | 'completed',
      lastActiveStage: row.lastActiveStage || 'home',
      stageCompletions: asStringRecord(row.stageCompletions),
      settings: asRecord(row.settings),
      tags: (row.tags as string[]) || [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastAccessedAt: row.lastAccessedAt.toISOString()
    }

    // Update last accessed
    await db.update(workflows).set({ lastAccessedAt: new Date() }).where(eq(workflows.id, id))

    res.json(workspace)
  } catch (error) {
    logError('Failed to fetch workspace', error as Error)
    res.status(500).json({ error: 'Failed to fetch workspace' })
  }
})

// Create new workspace
router.post('/workspaces', async (req, res) => {
  try {
    const input: CreateWorkspaceInput = req.body
    const userId = 1 // TODO: Get from auth session

    if (!input.name || input.name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name is required' })
    }

    const [newWorkspace] = await db
      .insert(workflows)
      .values({
        userId,
        name: input.name.trim(),
        ticker: input.ticker?.trim() || null,
        companyName: input.companyName?.trim() || null,
        description: input.description?.trim() || null,
        status: 'active',
        lastActiveStage: 'home',
        stageCompletions: {},
        settings: {},
        tags: input.tags || [],
        lastAccessedAt: new Date()
      })
      .returning()

    const workspace: IdeaWorkspace = {
      id: newWorkspace.id,
      userId: newWorkspace.userId,
      name: newWorkspace.name,
      ticker: newWorkspace.ticker,
      companyName: newWorkspace.companyName,
      description: newWorkspace.description,
      status: newWorkspace.status as 'active' | 'archived' | 'completed',
      lastActiveStage: newWorkspace.lastActiveStage || 'home',
      stageCompletions: asStringRecord(newWorkspace.stageCompletions),
      settings: asRecord(newWorkspace.settings),
      tags: (newWorkspace.tags as string[]) || [],
      createdAt: newWorkspace.createdAt.toISOString(),
      updatedAt: newWorkspace.updatedAt.toISOString(),
      lastAccessedAt: newWorkspace.lastAccessedAt.toISOString()
    }

    log(`Created workspace: ${workspace.name} (ID: ${workspace.id})`)
    res.status(201).json(workspace)
  } catch (error) {
    logError('Failed to create workspace', error as Error)
    res.status(500).json({ error: 'Failed to create workspace' })
  }
})

// Update workspace
router.patch('/workspaces/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const userId = 1 // TODO: Get from auth session
    const input: UpdateWorkspaceInput = req.body

    // Verify ownership
    const existing = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, userId)))
      .limit(1)

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    const updateData: Partial<WorkflowRow> & { updatedAt: Date } = {
      updatedAt: new Date()
    }

    if (input.name !== undefined) updateData.name = input.name.trim()
    if (input.ticker !== undefined) updateData.ticker = input.ticker?.trim() || null
    if (input.companyName !== undefined) updateData.companyName = input.companyName?.trim() || null
    if (input.description !== undefined) updateData.description = input.description?.trim() || null
    if (input.status !== undefined) updateData.status = input.status
    if (input.lastActiveStage !== undefined) updateData.lastActiveStage = input.lastActiveStage
    if (input.stageCompletions !== undefined) updateData.stageCompletions = input.stageCompletions
    if (input.settings !== undefined) {
      const existingSettings = asRecord(existing[0].settings)
      updateData.settings = { ...existingSettings, ...input.settings }
    }
    if (input.tags !== undefined) updateData.tags = input.tags

    const [updated] = await db
      .update(workflows)
      .set(updateData)
      .where(eq(workflows.id, id))
      .returning()

    const workspace: IdeaWorkspace = {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      ticker: updated.ticker,
      companyName: updated.companyName,
      description: updated.description,
      status: updated.status as 'active' | 'archived' | 'completed',
      lastActiveStage: updated.lastActiveStage || 'home',
      stageCompletions: asStringRecord(updated.stageCompletions),
      settings: asRecord(updated.settings),
      tags: (updated.tags as string[]) || [],
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastAccessedAt: updated.lastAccessedAt.toISOString()
    }

    res.json(workspace)
  } catch (error) {
    logError('Failed to update workspace', error as Error)
    res.status(500).json({ error: 'Failed to update workspace' })
  }
})

// Delete workspace
router.delete('/workspaces/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const userId = 1 // TODO: Get from auth session

    const result = await db
      .delete(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, userId)))
      .returning()

    if (result.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    log(`Deleted workspace ID: ${id}`)
    res.status(204).send()
  } catch (error) {
    logError('Failed to delete workspace', error as Error)
    res.status(500).json({ error: 'Failed to delete workspace' })
  }
})

// Get artifacts for workspace
router.get('/workspaces/:id/artifacts', async (req, res) => {
  try {
    const workflowId = Number(req.params.id)
    const { stageSlug, type } = req.query

    let query = db
      .select()
      .from(workflowArtifacts)
      .where(eq(workflowArtifacts.workflowId, workflowId))

    const stageSlugFilter = typeof stageSlug === 'string' ? stageSlug : undefined
    const typeFilter = typeof type === 'string' ? type : undefined

    if (stageSlugFilter) {
      query = query.where(eq(workflowArtifacts.stageSlug, stageSlugFilter))
    }
    if (typeFilter) {
      query = query.where(eq(workflowArtifacts.type, typeFilter))
    }

    const results = await query.orderBy(desc(workflowArtifacts.updatedAt))

    const artifacts: WorkspaceArtifact[] = results.map((row: ArtifactRow) => ({
      id: row.id,
      workflowId: row.workflowId,
      stageSlug: row.stageSlug,
      type: row.type,
      name: row.name,
      data: asRecord(row.data),
      metadata: asRecord(row.metadata),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }))

    res.json({ artifacts, count: artifacts.length })
  } catch (error) {
    logError('Failed to fetch artifacts', error as Error)
    res.status(500).json({ error: 'Failed to fetch artifacts' })
  }
})

// Create artifact
router.post('/workspaces/:id/artifacts', async (req, res) => {
  try {
    const workflowId = Number(req.params.id)
    const input: CreateArtifactInput = req.body

    if (!input.name || !input.type || !input.stageSlug) {
      return res.status(400).json({ error: 'Missing required fields: name, type, stageSlug' })
    }

    const [newArtifact] = await db
      .insert(workflowArtifacts)
      .values({
        workflowId,
        stageSlug: input.stageSlug,
        type: input.type,
        name: input.name,
        data: input.data || {},
        metadata: input.metadata || {}
      })
      .returning()

    const artifact: WorkspaceArtifact = {
      id: newArtifact.id,
      workflowId: newArtifact.workflowId,
      stageSlug: newArtifact.stageSlug,
      type: newArtifact.type,
      name: newArtifact.name,
      data: asRecord(newArtifact.data),
      metadata: asRecord(newArtifact.metadata),
      createdAt: newArtifact.createdAt.toISOString(),
      updatedAt: newArtifact.updatedAt.toISOString()
    }

    res.status(201).json(artifact)
  } catch (error) {
    logError('Failed to create artifact', error as Error)
    res.status(500).json({ error: 'Failed to create artifact' })
  }
})

// Get conversation history for workspace
router.get('/workspaces/:id/conversations', async (req, res) => {
  try {
    const workflowId = Number(req.params.id)
    const limit = Number(req.query.limit) || 50

    const results = await db
      .select()
      .from(workflowConversations)
      .where(eq(workflowConversations.workflowId, workflowId))
      .orderBy(desc(workflowConversations.createdAt))
      .limit(limit)

    const messages: ConversationMessage[] = results
      .map((row: ConversationRow) => ({
        id: row.id,
        workflowId: row.workflowId,
        role: row.role as 'user' | 'assistant',
        content: row.content,
        context: asRecord(row.context),
        createdAt: row.createdAt.toISOString()
      }))
      .reverse() // Oldest first for display

    res.json({ messages, count: messages.length })
  } catch (error) {
    logError('Failed to fetch conversations', error as Error)
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

// Add message to conversation
router.post('/workspaces/:id/conversations', async (req, res) => {
  try {
    const workflowId = Number(req.params.id)
    const input: CreateMessageInput = req.body

    if (!input.role || !input.content) {
      return res.status(400).json({ error: 'Missing required fields: role, content' })
    }

    const [newMessage] = await db
      .insert(workflowConversations)
      .values({
        workflowId,
        role: input.role,
        content: input.content,
        context: input.context || {}
      })
      .returning()

    const message: ConversationMessage = {
      id: newMessage.id,
      workflowId: newMessage.workflowId,
      role: newMessage.role as 'user' | 'assistant',
      content: newMessage.content,
      context: asRecord(newMessage.context),
      createdAt: newMessage.createdAt.toISOString()
    }

    res.status(201).json(message)
  } catch (error) {
    logError('Failed to create message', error as Error)
    res.status(500).json({ error: 'Failed to create message' })
  }
})

export default router

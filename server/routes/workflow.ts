import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../lib/db'
import {
  workflowMemos,
  workflowNormalizations,
  workflowValuations,
  workflowMonitorings,
  workflows
} from '../../lib/db/schema'
import { requireAdmin } from '../../lib/auth'
import { log } from '../../lib/log'

const router = Router()

// Middleware to require admin auth
router.use((req, res, next) => {
  try {
    requireAdmin(req.headers.authorization?.replace('Bearer ', ''))
    next()
  } catch {
    res.status(401).json({ error: 'Admin access required' })
  }
})

// Create or update memo state
router.post('/memo-state', async (req, res) => {
  const { workflowId, sections, exhibits, reviewerThreads } = req.body
  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId required' })
  }

  try {
    // Check if workflow exists
    const existingWorkflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    })
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    // Upsert memo state
    const [result] = await db
      .insert(workflowMemos)
      .values({
        workflowId,
        sections: sections || {},
        exhibits: exhibits || {},
        reviewerThreads: reviewerThreads || []
      })
      .onConflictDoUpdate({
        target: workflowMemos.workflowId,
        set: {
          sections: sections || workflowMemos.sections,
          exhibits: exhibits || workflowMemos.exhibits,
          reviewerThreads: reviewerThreads || workflowMemos.reviewerThreads,
          updatedAt: new Date()
        }
      })
      .returning()

    log(`Memo state updated for workflow ${workflowId}`)
    res.json(result)
  } catch (error) {
    log(`Error updating memo state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get memo state
router.get('/memo-state/:workflowId', async (req, res) => {
  const { workflowId } = req.params

  try {
    const memo = await db.query.workflowMemos.findFirst({
      where: eq(workflowMemos.workflowId, parseInt(workflowId))
    })
    if (!memo) {
      return res.status(404).json({ error: 'Memo state not found' })
    }
    res.json(memo)
  } catch (error) {
    log(`Error fetching memo state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create or update normalization state
router.post('/normalization-state', async (req, res) => {
  const { workflowId, reconciliationState } = req.body
  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId required' })
  }

  try {
    const existingWorkflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    })
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const [result] = await db
      .insert(workflowNormalizations)
      .values({
        workflowId,
        reconciliationState: reconciliationState || {}
      })
      .onConflictDoUpdate({
        target: workflowNormalizations.workflowId,
        set: {
          reconciliationState: reconciliationState || workflowNormalizations.reconciliationState,
          updatedAt: new Date()
        }
      })
      .returning()

    log(`Normalization state updated for workflow ${workflowId}`)
    res.json(result)
  } catch (error) {
    log(`Error updating normalization state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get normalization state
router.get('/normalization-state/:workflowId', async (req, res) => {
  const { workflowId } = req.params

  try {
    const normalization = await db.query.workflowNormalizations.findFirst({
      where: eq(workflowNormalizations.workflowId, parseInt(workflowId))
    })
    if (!normalization) {
      return res.status(404).json({ error: 'Normalization state not found' })
    }
    res.json(normalization)
  } catch (error) {
    log(`Error fetching normalization state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create or update valuation state
router.post('/valuation-state', async (req, res) => {
  const { workflowId, selections, overrides } = req.body
  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId required' })
  }

  try {
    const existingWorkflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    })
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const [result] = await db
      .insert(workflowValuations)
      .values({
        workflowId,
        selections: selections || {},
        overrides: overrides || {}
      })
      .onConflictDoUpdate({
        target: workflowValuations.workflowId,
        set: {
          selections: selections || workflowValuations.selections,
          overrides: overrides || workflowValuations.overrides,
          updatedAt: new Date()
        }
      })
      .returning()

    log(`Valuation state updated for workflow ${workflowId}`)
    res.json(result)
  } catch (error) {
    log(`Error updating valuation state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get valuation state
router.get('/valuation-state/:workflowId', async (req, res) => {
  const { workflowId } = req.params

  try {
    const valuation = await db.query.workflowValuations.findFirst({
      where: eq(workflowValuations.workflowId, parseInt(workflowId))
    })
    if (!valuation) {
      return res.status(404).json({ error: 'Valuation state not found' })
    }
    res.json(valuation)
  } catch (error) {
    log(`Error fetching valuation state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create or update monitoring state
router.post('/monitoring-state', async (req, res) => {
  const { workflowId, acknowledgements, deltaOverrides } = req.body
  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId required' })
  }

  try {
    const existingWorkflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    })
    if (!existingWorkflow) {
      return res.status(404).json({ error: 'Workflow not found' })
    }

    const [result] = await db
      .insert(workflowMonitorings)
      .values({
        workflowId,
        acknowledgements: acknowledgements || {},
        deltaOverrides: deltaOverrides || {}
      })
      .onConflictDoUpdate({
        target: workflowMonitorings.workflowId,
        set: {
          acknowledgements: acknowledgements || workflowMonitorings.acknowledgements,
          deltaOverrides: deltaOverrides || workflowMonitorings.deltaOverrides,
          updatedAt: new Date()
        }
      })
      .returning()

    log(`Monitoring state updated for workflow ${workflowId}`)
    res.json(result)
  } catch (error) {
    log(`Error updating monitoring state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get monitoring state
router.get('/monitoring-state/:workflowId', async (req, res) => {
  const { workflowId } = req.params

  try {
    const monitoring = await db.query.workflowMonitorings.findFirst({
      where: eq(workflowMonitorings.workflowId, parseInt(workflowId))
    })
    if (!monitoring) {
      return res.status(404).json({ error: 'Monitoring state not found' })
    }
    res.json(monitoring)
  } catch (error) {
    log(`Error fetching monitoring state: ${error}`)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router }
import type {
  IdeaWorkspace,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceArtifact,
  CreateArtifactInput,
  ConversationMessage,
  CreateMessageInput,
  WorkspaceDataSnapshot,
  AiAuditSummary,
  ReviewerAssignment,
  ReviewerAssignmentInput,
  ReviewerAssignmentUpdateInput,
  AuditTimelineEvent,
  AuditEventInput,
  AuditEventFilters
} from '@shared/types'

const API_BASE = '/api'

// Workspace CRUD operations
export async function fetchWorkspaces(
  status: 'active' | 'archived' | 'completed' = 'active'
): Promise<IdeaWorkspace[]> {
  const res = await fetch(`${API_BASE}/workspaces?status=${status}`)
  if (!res.ok) throw new Error('Failed to fetch workspaces')
  const data = await res.json()
  return data.workspaces
}

export async function fetchWorkspace(id: number): Promise<IdeaWorkspace> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`)
  if (!res.ok) throw new Error('Failed to fetch workspace')
  return res.json()
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<IdeaWorkspace> {
  const res = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to create workspace')
  return res.json()
}

export async function updateWorkspace(
  id: number,
  input: UpdateWorkspaceInput
): Promise<IdeaWorkspace> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to update workspace')
  return res.json()
}

export async function deleteWorkspace(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/workspaces/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Failed to delete workspace')
}

// Artifact operations
export async function fetchArtifacts(
  workspaceId: number,
  filters?: { stageSlug?: string; type?: string }
): Promise<WorkspaceArtifact[]> {
  const params = new URLSearchParams()
  if (filters?.stageSlug) params.set('stageSlug', filters.stageSlug)
  if (filters?.type) params.set('type', filters.type)

  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/artifacts?${params}`)
  if (!res.ok) throw new Error('Failed to fetch artifacts')
  const data = await res.json()
  return data.artifacts
}

export async function createArtifact(
  workspaceId: number,
  input: CreateArtifactInput
): Promise<WorkspaceArtifact> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/artifacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to create artifact')
  return res.json()
}

// Conversation operations
export async function fetchConversations(
  workspaceId: number,
  limit = 50
): Promise<ConversationMessage[]> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/conversations?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch conversations')
  const data = await res.json()
  return data.messages
}

export async function createMessage(
  workspaceId: number,
  input: CreateMessageInput
): Promise<ConversationMessage> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error('Failed to create message')
  return res.json()
}

// Snapshot + audit provenance operations
export async function fetchWorkspaceSnapshots(
  workspaceId: number
): Promise<WorkspaceDataSnapshot[]> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/snapshots`)
  if (!res.ok) throw new Error('Failed to fetch workspace snapshots')
  const data = await res.json()
  return data.snapshots
}

export async function fetchAiAuditSummary(): Promise<AiAuditSummary> {
  const res = await fetch(`${API_BASE}/copilot/audit/summary`)
  if (!res.ok) throw new Error('Failed to fetch AI audit summary')
  return res.json()
}

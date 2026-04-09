import { apiClient } from '@/lib/api'

export interface Workflow {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'active' | 'disabled'
  version: string
  isPublic: boolean
  executionCount: number
  lastExecutionAt: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkflowDetail extends Workflow {
  nodes: any[]
  edges: any[]
  variables: any[]
}

export interface PublishHistory {
  id: string
  version: string
  changes: string
  publishedAt: string
  publishedBy: string
}

// Get all workflows
export async function getWorkflows(): Promise<Workflow[]> {
  const data = await apiClient.get<{ success: boolean; workflows: Workflow[] }>('/api/workflows')
  if (!data.success) {
    throw new Error('Failed to fetch workflows')
  }
  return data.workflows
}

// Get single workflow
export async function getWorkflow(id: string): Promise<WorkflowDetail> {
  const data = await apiClient.get<{ success: boolean; workflow: WorkflowDetail }>(`/api/workflows/${id}`)
  if (!data.success) {
    throw new Error('Workflow not found')
  }
  return data.workflow
}

// Create workflow
export async function createWorkflow(input: {
  name: string
  description?: string
  nodes?: any[]
  edges?: any[]
  variables?: any[]
}): Promise<{ workflowId: string }> {
  const data = await apiClient.post<{ success: boolean; workflowId: string; message?: string }>(
    '/api/workflows',
    input
  )
  if (!data.success) {
    throw new Error(data.message || 'Failed to create workflow')
  }
  return { workflowId: data.workflowId }
}

// Update workflow
export async function updateWorkflow(
  id: string,
  input: Partial<{
    name: string
    description: string
    nodes: any[]
    edges: any[]
    variables: any[]
    status: 'draft' | 'active' | 'disabled'
    isPublic: boolean
  }>
): Promise<void> {
  const data = await apiClient.put<{ success: boolean; message?: string }>(`/api/workflows/${id}`, input)
  if (!data.success) {
    throw new Error(data.message || 'Failed to update workflow')
  }
}

// Delete workflow
export async function deleteWorkflow(id: string): Promise<void> {
  const data = await apiClient.delete<{ success: boolean; message?: string }>(`/api/workflows/${id}`)
  if (!data.success) {
    throw new Error(data.message || 'Failed to delete workflow')
  }
}

// Publish workflow
export async function publishWorkflow(
  id: string,
  input: { version?: string; changes?: string }
): Promise<void> {
  const data = await apiClient.post<{ success: boolean; message?: string }>(`/api/workflows/${id}/publish`, input)
  if (!data.success) {
    throw new Error(data.message || 'Failed to publish workflow')
  }
}

// Get publish history
export async function getPublishHistory(id: string): Promise<PublishHistory[]> {
  const data = await apiClient.get<{ success: boolean; history: PublishHistory[] }>(
    `/api/workflows/${id}/publish-history`
  )
  if (!data.success) {
    throw new Error('Failed to fetch publish history')
  }
  return data.history || []
}

// Export workflow
export async function exportWorkflow(id: string): Promise<any> {
  const data = await apiClient.get<{ success: boolean; data: any }>(`/api/workflows/${id}/export`)
  if (!data.success) {
    throw new Error('Failed to export workflow')
  }
  return data.data
}

// Import workflow
export async function importWorkflow(input: {
  name: string
  description?: string
  nodes: any[]
  edges: any[]
  variables?: any[]
}): Promise<{ workflowId: string }> {
  const data = await apiClient.post<{ success: boolean; workflowId: string; message?: string }>(
    '/api/workflows/import',
    input
  )
  if (!data.success) {
    throw new Error(data.message || 'Failed to import workflow')
  }
  return { workflowId: data.workflowId }
}

// Execute workflow
export async function executeWorkflow(
  id: string,
  input?: Record<string, any>
): Promise<{ success: boolean; result: any; runId: string; executionId: string }> {
  const data = await apiClient.post<{ success: boolean; result: any; runId: string; executionId: string; error?: string }>(
    `/api/workflows/${id}/execute`,
    input
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to execute workflow')
  }
  return data
}

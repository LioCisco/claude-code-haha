import type { Agent } from '@/types'

export interface AgentInput {
  name: string
  role: string
  avatar?: string
  description?: string
  skills?: string[]
  model?: string
  color?: string
  systemPrompt?: string
  isActive?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  agent?: T
  agents?: T[]
}

// Get all agents
export async function getAgents(): Promise<Agent[]> {
  const res = await fetch('/api/agents')
  const data: ApiResponse<Agent> = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch agents')
  }
  return data.agents || []
}

// Get single agent by ID
export async function getAgent(id: string): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`)
  const data: ApiResponse<Agent> = await res.json()
  if (!data.success || !data.agent) {
    throw new Error(data.message || 'Agent not found')
  }
  return data.agent
}

// Create new agent
export async function createAgent(input: AgentInput): Promise<Agent> {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data: ApiResponse<Agent> = await res.json()
  if (!data.success || !data.agent) {
    throw new Error(data.message || 'Failed to create agent')
  }
  return data.agent
}

// Update agent
export async function updateAgent(id: string, input: Partial<AgentInput>): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data: ApiResponse<Agent> = await res.json()
  if (!data.success || !data.agent) {
    throw new Error(data.message || 'Failed to update agent')
  }
  return data.agent
}

// Delete agent
export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`/api/agents/${id}`, {
    method: 'DELETE',
  })
  const data: ApiResponse<Agent> = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to delete agent')
  }
}

// Toggle agent active status
export async function toggleAgentStatus(id: string): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}/toggle`, {
    method: 'POST',
  })
  const data: ApiResponse<Agent> = await res.json()
  if (!data.success || !data.agent) {
    throw new Error(data.message || 'Failed to toggle agent status')
  }
  return data.agent
}

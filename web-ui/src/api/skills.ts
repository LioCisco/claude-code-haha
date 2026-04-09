import type { Skill } from '@/types'

export interface SkillInput {
  name: string
  description: string
  icon?: string
  category: string
  status?: string
  executionType?: string
  executionConfig?: Record<string, unknown>
  configSchema?: Record<string, unknown>
  authType?: string
  authConfig?: Record<string, unknown>
  timeoutMs?: number
  retryPolicy?: {
    maxRetries: number
    backoffType: 'fixed' | 'exponential'
    initialDelay: number
  }
  rateLimitPerMinute?: number
  documentationUrl?: string
  examples?: Record<string, unknown>[]
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  skill?: T
  skills?: T[]
}

// Get all skills
export async function getSkills(category?: string): Promise<Skill[]> {
  const url = category ? `/api/skills?category=${category}` : '/api/skills'
  const res = await fetch(url)
  const data: ApiResponse<Skill> = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch skills')
  }
  return data.skills || []
}

// Get single skill by ID
export async function getSkill(id: string): Promise<Skill> {
  const res = await fetch(`/api/skills/${id}`)
  const data: ApiResponse<Skill> = await res.json()
  if (!data.success || !data.skill) {
    throw new Error(data.message || 'Skill not found')
  }
  return data.skill
}

// Execute skill
export async function executeSkill(
  id: string,
  params: Record<string, unknown>,
  options?: { agentId?: string; sessionId?: string }
): Promise<{
  success: boolean
  message: string
  result: unknown
  durationMs?: number
}> {
  const res = await fetch(`/api/skills/${id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params, ...options }),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to execute skill')
  }
  return data
}

// Update skill configuration
export async function updateSkill(
  id: string,
  input: Partial<SkillInput>
): Promise<Skill> {
  const res = await fetch(`/api/skills/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data: ApiResponse<Skill> = await res.json()
  if (!data.success || !data.skill) {
    throw new Error(data.message || 'Failed to update skill')
  }
  return data.skill
}

// Install new skill
export async function installSkill(input: SkillInput): Promise<Skill> {
  const res = await fetch('/api/skills/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data: ApiResponse<Skill> = await res.json()
  if (!data.success || !data.skill) {
    throw new Error(data.message || 'Failed to install skill')
  }
  return data.skill
}

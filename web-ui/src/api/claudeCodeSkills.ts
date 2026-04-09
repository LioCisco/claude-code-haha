import type { Skill } from '@/types'

export interface ClaudeCodeSkill {
  id: string
  name: string
  description: string
  type: 'command' | 'bundled'
  category: string
  aliases?: string[]
  usage: number
  isActive: boolean
  source: string
}

// Get all Claude Code skills
export async function getClaudeCodeSkills(): Promise<ClaudeCodeSkill[]> {
  const res = await fetch('/api/claude-skills')
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch Claude Code skills')
  }
  return data.skills || []
}

// Get skill categories
export async function getClaudeCodeSkillCategories(): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/claude-skills/categories')
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch categories')
  }
  return data.categories || []
}

// Convert Claude Code skill to unified Skill type
export function convertToUnifiedSkill(claudeSkill: ClaudeCodeSkill): Skill {
  return {
    id: claudeSkill.id,
    name: claudeSkill.name,
    description: claudeSkill.description,
    icon: 'Terminal',
    category: claudeSkill.category,
    status: claudeSkill.isActive ? 'active' : 'inactive',
    isBuiltIn: true,
    executionType: 'builtin',
    authType: 'none',
    timeoutMs: 30000,
    rateLimitPerMinute: 60,
    usage: claudeSkill.usage,
  }
}

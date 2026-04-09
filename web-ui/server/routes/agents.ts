import { Elysia, t } from 'elysia'
import {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  toggleAgentStatus
} from '../db'

// Agent type definition
interface Agent {
  id: string
  name: string
  role: string
  avatar: string
  description: string
  skills: string[]
  model: string
  color: string
  systemPrompt?: string
  isActive: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// Convert DB row to Agent object
function dbRowToAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    description: row.description,
    skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills || [],
    model: row.model,
    color: row.color,
    systemPrompt: row.system_prompt,
    isActive: row.is_active === 1,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const agentRoutes = new Elysia({ prefix: '/api/agents' })
  // Get all agents
  .get('/', async () => {
    const rows = await getAllAgents()
    const agents = rows.map(dbRowToAgent)
    return { success: true, agents }
  })

  // Get single agent
  .get('/:id', async ({ params, set }) => {
    const row = await getAgentById(params.id)
    if (!row) {
      set.status = 404
      return { success: false, message: 'Agent not found' }
    }
    return { success: true, agent: dbRowToAgent(row) }
  })

  // Create new agent
  .post('/', async ({ body, set }) => {
    try {
      const id = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      console.log('[Agents] Creating agent:', { id, name: body.name, role: body.role })

      await createAgent({
        id,
        name: body.name,
        role: body.role,
        avatar: body.avatar || '🤖',
        description: body.description || '',
        skills: body.skills || [],
        model: body.model || 'claude-sonnet-4-6',
        color: body.color || '#3b82f6',
        systemPrompt: body.systemPrompt,
        isActive: body.isActive !== false,
      })

      const row = await getAgentById(id)
      if (!row) throw new Error('Failed to create agent - not found after insert')

      console.log('[Agents] Agent created successfully:', id)
      return { success: true, agent: dbRowToAgent(row) }
    } catch (err) {
      console.error('[Agents] Create agent error:', err)
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      name: t.String(),
      role: t.String(),
      avatar: t.Optional(t.String()),
      description: t.Optional(t.String()),
      skills: t.Optional(t.Array(t.String())),
      model: t.Optional(t.String()),
      color: t.Optional(t.String()),
      systemPrompt: t.Optional(t.String()),
      isActive: t.Optional(t.Boolean()),
    })
  })

  // Update agent
  .put('/:id', async ({ params, body, set }) => {
    try {
      const success = await updateAgent(params.id, {
        name: body.name,
        role: body.role,
        avatar: body.avatar,
        description: body.description,
        skills: body.skills,
        model: body.model,
        color: body.color,
        systemPrompt: body.systemPrompt,
        isActive: body.isActive,
      })

      if (!success) {
        set.status = 404
        return { success: false, message: 'Agent not found or cannot modify default agents' }
      }

      const row = await getAgentById(params.id)
      return { success: true, agent: dbRowToAgent(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      role: t.Optional(t.String()),
      avatar: t.Optional(t.String()),
      description: t.Optional(t.String()),
      skills: t.Optional(t.Array(t.String())),
      model: t.Optional(t.String()),
      color: t.Optional(t.String()),
      systemPrompt: t.Optional(t.String()),
      isActive: t.Optional(t.Boolean()),
    })
  })

  // Delete agent
  .delete('/:id', async ({ params, set }) => {
    const deleted = await deleteAgent(params.id)
    if (!deleted) {
      set.status = 404
      return { success: false, message: 'Agent not found or cannot delete default agents' }
    }
    return { success: true, message: 'Agent deleted' }
  })

  // Toggle agent active status
  .post('/:id/toggle', async ({ params, set }) => {
    try {
      const success = await toggleAgentStatus(params.id)
      if (!success) {
        set.status = 404
        return { success: false, message: 'Agent not found or cannot toggle default agents' }
      }

      const row = await getAgentById(params.id)
      return { success: true, agent: dbRowToAgent(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  })

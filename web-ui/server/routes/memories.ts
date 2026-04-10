/**
 * 记忆系统 API 路由
 * 管理用户记忆、反馈、项目信息和参考资源
 */

import { Elysia, t } from 'elysia'
import { v4 as uuidv4 } from 'uuid'
import {
  getUserMemories,
  getMemoryById,
  createMemory,
  updateMemory,
  deleteMemory,
  searchMemories,
} from '../db'
import type { MemoryType } from '../types'
import { syncMemoriesToFiles, syncMemoriesFromFiles, deleteMemoryFile } from '../lib/memorySync'
import { findRelevantMemories, extractMemoryFromConversation } from '../lib/memoryAI'
import { verifyToken } from '../lib/jwt'

// Helper to get userId from request
function getUserIdFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  try {
    const payload = verifyToken(authHeader.substring(7))
    return payload.userId
  } catch {
    return null
  }
}

export const memoryRoutes = new Elysia({ prefix: '/api/memories' })
  // Get all memories
  .get('/', async ({ request, query }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { type } = query as { type?: string }
    const memories = await getUserMemories(userId, type)

    return {
      success: true,
      memories: memories.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        type: m.type,
        content: m.content,
        tags: m.tags,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      })),
    }
  }, {
    query: t.Object({
      type: t.Optional(t.String()),
    }),
  })

  // Get single memory
  .get('/:id', async ({ params, request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const memory = await getMemoryById(params.id, userId)
    if (!memory) {
      return { success: false, error: 'Memory not found' }
    }

    return {
      success: true,
      memory: {
        id: memory.id,
        name: memory.name,
        description: memory.description,
        type: memory.type,
        content: memory.content,
        tags: memory.tags,
        createdAt: memory.created_at,
        updatedAt: memory.updated_at,
      },
    }
  })

  // Create memory
  .post('/', async ({ body, request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { name, description, type, content, tags } = body as any
    const memoryId = uuidv4()

    await createMemory({
      id: memoryId,
      userId,
      name,
      description,
      type: type as MemoryType,
      content,
      tags,
    })

    return {
      success: true,
      memoryId,
      message: '记忆已创建',
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.String(),
      type: t.Union([
        t.Literal('user'),
        t.Literal('feedback'),
        t.Literal('project'),
        t.Literal('reference'),
      ]),
      content: t.String(),
      tags: t.Optional(t.Array(t.String())),
    }),
  })

  // Update memory
  .put('/:id', async ({ params, body, request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { name, description, content, tags } = body as any
    const success = await updateMemory(params.id, userId, {
      name,
      description,
      content,
      tags,
    })

    if (!success) {
      return { success: false, error: 'Memory not found' }
    }

    return {
      success: true,
      message: '记忆已更新',
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      content: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
    }),
  })

  // Delete memory
  .delete('/:id', async ({ params, request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const success = await deleteMemory(params.id, userId)
    if (!success) {
      return { success: false, error: 'Memory not found' }
    }

    return {
      success: true,
      message: '记忆已删除',
    }
  })

  // Search memories
  .get('/search', async ({ query, request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { q } = query as { q: string }
    if (!q) {
      return { success: false, error: 'Query required' }
    }

    const memories = await searchMemories(userId, q)

    return {
      success: true,
      memories: memories.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        type: m.type,
        content: m.content,
        tags: m.tags,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      })),
    }
  }, {
    query: t.Object({
      q: t.String(),
    }),
  })

  // Get relevant memories for a query (AI-powered)
  .get('/relevant', async ({ query, request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { q, limit } = query as { q: string; limit?: string }
    if (!q) {
      return { success: false, error: 'Query required' }
    }

    const memories = await findRelevantMemories(userId, q, limit ? parseInt(limit) : 3)

    return {
      success: true,
      memories,
    }
  }, {
    query: t.Object({
      q: t.String(),
      limit: t.Optional(t.String()),
    }),
  })

  // Extract memory from conversation
  .post('/extract', async ({ body, request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const { conversation } = body as { conversation: Array<{ role: string; content: string }> }
    if (!conversation || !Array.isArray(conversation)) {
      return { success: false, error: 'Conversation array required' }
    }

    const result = await extractMemoryFromConversation(userId, conversation)

    if (!result.shouldExtract) {
      return { success: true, shouldExtract: false }
    }

    // Auto-create the memory
    const memoryId = uuidv4()
    await createMemory({
      id: memoryId,
      userId,
      name: result.name,
      description: result.description,
      type: result.type,
      content: result.content,
      tags: result.tags,
    })

    // Sync to file system
    await syncMemoriesToFiles(userId)

    return {
      success: true,
      shouldExtract: true,
      memoryId,
      memory: {
        id: memoryId,
        name: result.name,
        description: result.description,
        type: result.type,
        content: result.content,
        tags: result.tags,
      },
    }
  }, {
    body: t.Object({
      conversation: t.Array(t.Object({
        role: t.String(),
        content: t.String(),
      })),
    }),
  })

  // Sync memories to file system
  .post('/sync/to-files', async ({ request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    await syncMemoriesToFiles(userId)

    return {
      success: true,
      message: '记忆已同步到文件系统',
    }
  })

  // Sync memories from file system
  .post('/sync/from-files', async ({ request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    await syncMemoriesFromFiles(userId)

    return {
      success: true,
      message: '记忆已从文件系统同步',
    }
  })

  // Get memory files list
  .get('/files', async ({ request }): Promise<any> => {
    const userId = getUserIdFromRequest(request)
    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const files = await listMemoryFiles()

    return {
      success: true,
      files,
    }
  })

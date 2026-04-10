import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import crypto from 'crypto'
import { chatRoutes } from './routes/chat'
import { agentRoutes } from './routes/agents'
import { skillRoutes } from './routes/skills'
import { storeRoutes } from './routes/store'
import { analyticsRoutes } from './routes/analytics'
import { scheduledTaskRoutes } from './routes/scheduledTasks'
import { authRoutes } from './routes/auth'
import { authMiddleware } from './middleware/auth'
import { claudeCodeSkillsRoutes } from './routes/claudeCodeSkills'
import { settingsRoutes } from './routes/settings'
import { workflowRoutes } from './routes/workflows'
import { inventoryRoutes } from './routes/inventory'
import { memoryRoutes } from './routes/memories'
import { pluginRoutes } from './routes/plugins'
import { marketplaceRoutes } from './routes/marketplace'
import { initializePluginEngine, loadActivePlugins } from './lib/pluginEngine'
import { chatWithAI, getAgentSystemPrompt } from './lib/ai'
import { ClaudeSession, type ChatEvent } from './lib/claudeSession'
import { initDatabase, getSessionMessages, getSession, createSession, checkDatabaseHealth, getUserSessions, updateSessionTitle, softDeleteSession } from './db'

// Map ws.id -> ClaudeSession
const sessions = new Map<string, ClaudeSession>()

// Database configuration
const DB_ENABLED = true

// Initialize database on startup
try {
  await initDatabase()
  console.log('[Server] Database initialized successfully')

  // Seed database with sample data
  const { seedDatabase } = await import('./db/seed')
  await seedDatabase()

  // Initialize plugin engine after database
  await initializePluginEngine()
  console.log('[Server] Plugin engine initialized successfully')
} catch (err) {
  console.error('[Server] Database initialization failed:', err)
  console.log('[Server] Running without database persistence')
}

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(staticPlugin({
    prefix: '/',
    assets: '../dist'
  }))
  // Serve uploaded avatars
  .use(staticPlugin({
    prefix: '/upload',
    assets: '../../upload'
  }))

  // Health check with database status
  .get('/api/health', async () => {
    const dbHealthy = await checkDatabaseHealth()
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected'
    }
  })

  // Get chat history for a session
  .get('/api/chat/history/:sessionId', async ({ params }) => {
    if (!DB_ENABLED) {
      return { messages: [] }
    }
    try {
      const messages = await getSessionMessages(params.sessionId, 100)
      return { messages }
    } catch (err) {
      return { error: 'Failed to fetch history', messages: [] }
    }
  })

  // API Routes
  .use(authRoutes)

  // Auth middleware for protected routes
  .use(authMiddleware)

  // Chat Session Routes - inline auth check
  // Get all chat sessions
  .get('/api/chat/sessions', async ({ query, request, set }) => {
    // Inline auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const token = authHeader.substring(7)
    try {
      const { verifyToken } = await import('./lib/jwt')
      const payload = verifyToken(token)
      ;(request as any).user = { id: payload.userId }
    } catch {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    if (!DB_ENABLED) {
      return { sessions: [] }
    }
    try {
      const { limit } = query
      // 从 authMiddleware 获取用户ID
      const userId = (request as any).user?.id
      const sessions = await getUserSessions(
        userId,
        limit ? parseInt(limit as string) : 50
      )
      return { sessions }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
      return { error: 'Failed to fetch sessions', sessions: [] }
    }
  })

  // Create new chat session
  .post('/api/chat/sessions', async ({ body, request, set }) => {
    // Inline auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const token = authHeader.substring(7)
    let userId: string
    try {
      const { verifyToken } = await import('./lib/jwt')
      const payload = verifyToken(token)
      userId = payload.userId
    } catch {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    if (!DB_ENABLED) {
      set.status = 500
      return { error: 'Database not enabled' }
    }
    try {
      const { title, agentId, agentName, agentAvatar } = body as any
      const sessionId = crypto.randomUUID()
      await createSession(sessionId, {
        userId,
        title: title || '新对话',
        agentId,
        agentName,
        agentAvatar
      })
      return { success: true, sessionId, title: title || '新对话', agentId, agentName, agentAvatar }
    } catch (err) {
      console.error('Failed to create session:', err)
      return { error: 'Failed to create session' }
    }
  })

  // Update session title
  .put('/api/chat/sessions/:sessionId', async ({ params, body, request, set }) => {
    // Inline auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const token = authHeader.substring(7)
    try {
      const { verifyToken } = await import('./lib/jwt')
      verifyToken(token)
    } catch {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    if (!DB_ENABLED) {
      return { error: 'Database not enabled' }
    }
    try {
      const { title } = body as any
      await updateSessionTitle(params.sessionId, title)
      return { success: true }
    } catch (err) {
      return { error: 'Failed to update session' }
    }
  })

  // Delete session
  .delete('/api/chat/sessions/:sessionId', async ({ params, request, set }) => {
    // Inline auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const token = authHeader.substring(7)
    try {
      const { verifyToken } = await import('./lib/jwt')
      verifyToken(token)
    } catch {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    if (!DB_ENABLED) {
      return { error: 'Database not enabled' }
    }
    try {
      await softDeleteSession(params.sessionId)
      return { success: true }
    } catch (err) {
      return { error: 'Failed to delete session' }
    }
  })
  .use(chatRoutes)
  .use(agentRoutes)
  .use(skillRoutes)
  .use(storeRoutes)
  .use(analyticsRoutes)
  .use(scheduledTaskRoutes)
  .use(claudeCodeSkillsRoutes)
  .use(settingsRoutes)
  .use(workflowRoutes)
  .use(inventoryRoutes)
  .use(memoryRoutes)
  .use(pluginRoutes)
  .use(marketplaceRoutes)

  // WebSocket for real-time chat with full Claude Code capabilities
  .ws('/ws/chat', {
    async open(ws) {
      console.log('[WebSocket] Connection opened:', ws.id)
      const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
      const baseURL = process.env.ANTHROPIC_BASE_URL
      const model = process.env.ANTHROPIC_MODEL || 'kimi-k2.5'

      // Use client-provided sessionId if available, otherwise use ws.id
      const querySessionId = ws.data.query?.sessionId
      const sessionId = typeof querySessionId === 'string' && querySessionId
        ? querySessionId
        : ws.id
      console.log('[WebSocket] Using sessionId:', sessionId, '(from query:', !!querySessionId, ')')

      // Get userId from token in query params
      let userId: string | undefined
      const token = ws.data.query?.token as string | undefined
      if (token) {
        try {
          const { verifyToken } = await import('./lib/jwt')
          const payload = verifyToken(token)
          userId = payload.userId
          console.log('[WebSocket] Authenticated user:', userId)
        } catch (err) {
          console.warn('[WebSocket] Invalid token, using anonymous session')
        }
      }

      // Create session in database if not exists
      if (DB_ENABLED) {
        try {
          const existingSession = await getSession(sessionId)
          if (!existingSession) {
            await createSession(sessionId, {
              userId,
              title: `会话 ${new Date().toLocaleString('zh-CN')}`,
            })
            console.log(`[WebSocket] Created new session in DB: ${sessionId} for user: ${userId || 'anonymous'}`)
          } else {
            console.log(`[WebSocket] Existing session found: ${sessionId}`)
          }
        } catch (err) {
          console.error('[WebSocket] Failed to create/verify session in DB:', err)
        }
      }

      // Create ClaudeSession with database support and user context
      const session = new ClaudeSession({
        apiKey: apiKey || '',
        baseURL,
        model,
        sessionId,
        dbEnabled: DB_ENABLED,
        userId: userId,
        async onEvent(event: ChatEvent) {
          ws.send(JSON.stringify(event))
        },
      })

      // Load history from database
      if (DB_ENABLED) {
        await session.loadHistoryFromDB()
      }

      sessions.set(ws.id, session)

      if (!apiKey) {
        ws.send(JSON.stringify({ type: 'error', message: 'AI 服务未配置' }))
        return
      }

      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Kane Work', sessionId }))
    },
    async message(ws, message) {
      console.log('[WebSocket] Raw message received:', typeof message, message)
      const session = sessions.get(ws.id)
      if (!session) {
        console.error('[WebSocket] Session not found for ws.id:', ws.id)
        ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }))
        return
      }

      let data: Record<string, unknown>
      try {
        // Handle both string (from JSON) and already-parsed object
        if (typeof message === 'string') {
          data = JSON.parse(message)
        } else if (Buffer.isBuffer(message)) {
          data = JSON.parse(message.toString())
        } else {
          data = message as Record<string, unknown>
        }
      } catch (e) {
        console.error('[WebSocket] Failed to parse message:', message, e)
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
        return
      }

      console.log('[WebSocket] Parsed data:', data.type)

      if (data.type === 'user_message') {
        console.log('[WebSocket] Processing user_message:', (data.content as string)?.slice(0, 50))

        // Get system prompt dynamically from database
        const systemPrompt = await getAgentSystemPrompt(data.agentId as string | undefined)

        const agentInfo = {
          agentId: data.agentId as string | undefined,
          agentName: data.agentName as string | undefined,
          agentAvatar: data.agentAvatar as string | undefined,
        }

        try {
          await session.submitUserMessage(data.content as string, systemPrompt, agentInfo)
          console.log('[WebSocket] submitUserMessage completed')
        } catch (err) {
          console.error('[WebSocket] submitUserMessage error:', err)
          ws.send(JSON.stringify({ type: 'error', message: String(err) }))
        }
        return
      }

      if (data.type === 'permission_response') {
        session.resolvePermission(data.allowed as boolean)
        return
      }

      if (data.type === 'question_response') {
        session.resolveQuestion(data.answer as string)
        return
      }

      if (data.type === 'load_history') {
        // Send history to client
        if (DB_ENABLED) {
          try {
            const sessionId = session.getSessionId()
            console.log('[WebSocket] Loading history for session:', sessionId)
            const messages = await getSessionMessages(sessionId, 100)
            console.log('[WebSocket] Sending', messages.length, 'messages to client')
            ws.send(JSON.stringify({ type: 'history_loaded', messages }))
          } catch (err) {
            console.error('[WebSocket] Failed to load history:', err)
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to load history' }))
          }
        }
        return
      }

      // Handle ping to keep connection alive
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }

      // Fallback echo for unhandled types
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${data.type}`
      }))
    },
    close(ws) {
      console.log('[WebSocket] Connection closed:', ws.id)
      // Don't delete session immediately to allow reconnection
      // sessions.delete(ws.id)
    },
  })

  .listen(8080)

console.log(`🚀 Kane Work server running at http://localhost:8080`)
console.log(`📚 API documentation at http://localhost:8080/swagger`)

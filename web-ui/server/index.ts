import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import { chatRoutes } from './routes/chat'
import { agentRoutes } from './routes/agents'
import { skillRoutes } from './routes/skills'
import { storeRoutes } from './routes/store'
import { analyticsRoutes } from './routes/analytics'
import { scheduledTaskRoutes } from './routes/scheduledTasks'
import { chatWithAI, agentSystemPrompts } from './lib/ai'
import { ClaudeSession, type ChatEvent } from './lib/claudeSession'

// Map ws.id -> ClaudeSession
const sessions = new Map<string, ClaudeSession>()

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(staticPlugin({
    prefix: '/',
    assets: '../dist'
  }))

  // Health check
  .get('/api/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // API Routes
  .use(chatRoutes)
  .use(agentRoutes)
  .use(skillRoutes)
  .use(storeRoutes)
  .use(analyticsRoutes)
  .use(scheduledTaskRoutes)

  // WebSocket for real-time chat with full Claude Code capabilities
  .ws('/ws/chat', {
    open(ws) {
      console.log('[WebSocket] Connection opened:', ws.id)
      const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
      const baseURL = process.env.ANTHROPIC_BASE_URL
      const model = process.env.ANTHROPIC_MODEL || 'kimi-k2.5'

      // Create session even without API key to avoid "Session not found" errors
      const session = new ClaudeSession({
        apiKey,
        baseURL,
        model,
        async onEvent(event: ChatEvent) {
          ws.send(JSON.stringify(event))
        },
      })

      sessions.set(ws.id, session)
      
      if (!apiKey) {
        ws.send(JSON.stringify({ type: 'error', message: 'AI 服务未配置' }))
        return
      }

      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Kane Work' }))
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
        const systemPrompt = data.agentId
          ? agentSystemPrompts[data.agentId as string] || agentSystemPrompts.default
          : agentSystemPrompts.default

        try {
          await session.submitUserMessage(data.content as string, systemPrompt)
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

      // Fallback echo for unhandled types
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${data.type}`
      }))
    },
    close(ws) {
      console.log('[WebSocket] Connection closed:', ws.id)
      sessions.delete(ws.id)
    },
  })

  .listen(8080)

console.log(`🚀 Kane Work server running at http://localhost:8080`)
console.log(`📚 API documentation at http://localhost:8080/swagger`)

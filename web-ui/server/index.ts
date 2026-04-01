import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { staticPlugin } from '@elysiajs/static'
import { chatRoutes } from './routes/chat'
import { agentRoutes } from './routes/agents'
import { skillRoutes } from './routes/skills'
import { storeRoutes } from './routes/store'
import { analyticsRoutes } from './routes/analytics'

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

  // WebSocket for real-time chat
  .ws('/ws/chat', {
    open(ws) {
      console.log('WebSocket connection opened')
      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Accio Work' }))
    },
    message(ws, message) {
      const data = JSON.parse(message as string)

      // Echo back for now - replace with actual AI processing
      ws.send(JSON.stringify({
        type: 'message',
        id: Date.now().toString(),
        role: 'assistant',
        content: `收到消息: ${data.content}`,
        timestamp: new Date().toISOString()
      }))
    },
    close(ws) {
      console.log('WebSocket connection closed')
    },
  })

  .listen(8080)

console.log(`🚀 Accio Work server running at http://localhost:8080`)
console.log(`📚 API documentation at http://localhost:8080/swagger`)

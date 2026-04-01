import { Elysia, t } from 'elysia'

// In-memory store for messages (replace with database in production)
const messages: Array<{
  id: string
  content: string
  role: string
  agentId?: string
  timestamp: string
}> = []

export const chatRoutes = new Elysia({ prefix: '/api/chat' })
  // Get all messages
  .get('/messages', () => messages)

  // Send a message
  .post('/messages', ({ body }) => {
    const message = {
      id: Date.now().toString(),
      ...body,
      timestamp: new Date().toISOString(),
    }
    messages.push(message)

    // Simulate AI response
    setTimeout(() => {
      messages.push({
        id: (Date.now() + 1).toString(),
        content: `AI回复: 收到您的消息 "${body.content}"`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      })
    }, 1000)

    return message
  }, {
    body: t.Object({
      content: t.String(),
      role: t.String(),
      agentId: t.Optional(t.String()),
    })
  })

  // Clear messages
  .delete('/messages', () => {
    messages.length = 0
    return { success: true }
  })

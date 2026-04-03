import { Elysia, t } from 'elysia'
import { chatWithAI, agentSystemPrompts } from '../lib/ai'

// In-memory store for messages (replace with database in production)
const messages: Array<{
  id: string
  content: string
  role: string
  agentId?: string
  agentName?: string
  agentAvatar?: string
  timestamp: string
}> = []

export const chatRoutes = new Elysia({ prefix: '/api/chat' })
  // Get all messages
  .get('/messages', () => messages)

  // Send a message
  .post('/messages', async ({ body }) => {
    const userMessage = {
      id: Date.now().toString(),
      content: body.content,
      role: 'user',
      timestamp: new Date().toISOString(),
    }
    messages.push(userMessage)

    // Build conversation history for AI (last 10 messages)
    const history = messages.slice(-10).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))

    // Determine system prompt based on agent
    const system = body.agentId
      ? agentSystemPrompts[body.agentId] || agentSystemPrompts.default
      : agentSystemPrompts.default

    const aiContent = await chatWithAI({
      messages: history,
      system,
    })

    const aiMessage = {
      id: (Date.now() + 1).toString(),
      content: aiContent,
      role: body.agentId ? 'agent' : 'assistant',
      agentId: body.agentId,
      agentName: body.agentName,
      agentAvatar: body.agentAvatar,
      timestamp: new Date().toISOString(),
    }
    messages.push(aiMessage)

    return { userMessage, aiMessage }
  }, {
    body: t.Object({
      content: t.String(),
      role: t.String(),
      agentId: t.Optional(t.String()),
      agentName: t.Optional(t.String()),
      agentAvatar: t.Optional(t.String()),
    })
  })

  // Clear messages
  .delete('/messages', () => {
    messages.length = 0
    return { success: true }
  })

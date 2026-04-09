import { apiClient } from '@/lib/api'

export interface ChatSession {
  id: string
  title: string
  userId?: string
  agentId?: string
  agentName?: string
  agentAvatar?: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

// Get all chat sessions
export async function getChatSessions(): Promise<ChatSession[]> {
  const data = await apiClient.get<{ sessions: ChatSession[] }>('/api/chat/sessions')
  return data.sessions || []
}

// Create new chat session
export async function createChatSession(input: {
  title?: string
  agentId?: string
  agentName?: string
  agentAvatar?: string
}): Promise<ChatSession> {
  const data = await apiClient.post<{
    success: boolean
    sessionId: string
    title: string
    agentId?: string
    agentName?: string
    agentAvatar?: string
    error?: string
  }>('/api/chat/sessions', input)
  if (data.error) {
    throw new Error(data.error)
  }
  return {
    id: data.sessionId,
    title: data.title,
    agentId: data.agentId,
    agentName: data.agentName,
    agentAvatar: data.agentAvatar,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// Update session title
export async function updateChatSession(sessionId: string, title: string): Promise<void> {
  const data = await apiClient.put<{ success: boolean; error?: string }>(
    `/api/chat/sessions/${sessionId}`,
    { title }
  )
  if (data.error) {
    throw new Error(data.error)
  }
}

// Delete chat session
export async function deleteChatSession(sessionId: string): Promise<void> {
  const data = await apiClient.delete<{ success: boolean; error?: string }>(
    `/api/chat/sessions/${sessionId}`
  )
  if (data.error) {
    throw new Error(data.error)
  }
}

// Get chat history
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const data = await apiClient.get<{ messages: ChatMessage[] }>(`/api/chat/history/${sessionId}`)
  return data.messages || []
}

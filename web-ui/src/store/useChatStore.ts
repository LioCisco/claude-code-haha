import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message, Agent, Task } from '@/types'
import { getAgents } from '@/api/agents'

interface ChatState {
  messages: Message[]
  agents: Agent[]
  activeAgents: string[]
  isTyping: boolean
  currentAgent: Agent | null
  tasks: Task[]
  // Session management
  sessions: { id: string; title: string; updatedAt: string; agentId?: string; agentName?: string; agentAvatar?: string }[]
  currentSessionId: string | null
  isLoadingAgents: boolean
  agentsError: string | null

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'> & { id?: string }) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearMessages: () => void
  setTyping: (typing: boolean) => void
  setCurrentAgent: (agent: Agent | null) => void
  toggleAgent: (agentId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  // Session actions
  setSessions: (sessions: ChatState['sessions']) => void
  setCurrentSessionId: (id: string | null) => void
  addSession: (session: { id: string; title: string; updatedAt: string; agentId?: string; agentName?: string; agentAvatar?: string }) => void
  removeSession: (id: string) => void
  updateSessionTitle: (id: string, title: string) => void
  // Agents actions
  loadAgents: () => Promise<void>
  setAgents: (agents: Agent[]) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, _get) => ({
      messages: [],
      agents: [],
      activeAgents: [],
      isTyping: false,
      currentAgent: null,
      tasks: [],
      // Session management
      sessions: [],
      currentSessionId: null,
      isLoadingAgents: false,
      agentsError: null,

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: message.id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date(),
        }
        set((state) => ({
          messages: [...state.messages, newMessage],
        }))
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }))
      },

      clearMessages: () => set({ messages: [] }),

      setTyping: (typing) => set({ isTyping: typing }),

      setCurrentAgent: (agent) => set({ currentAgent: agent }),

      toggleAgent: (agentId) => {
        set((state) => ({
          activeAgents: state.activeAgents.includes(agentId)
            ? state.activeAgents.filter((id) => id !== agentId)
            : [...state.activeAgents, agentId],
        }))
      },

      addTask: (task) => {
        const newTask: Task = {
          ...task,
          id: Math.random().toString(36).substring(2, 15),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }))
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date() }
              : t
          ),
        }))
      },

      // Session actions
      setSessions: (sessions) => set({ sessions }),

      setCurrentSessionId: (id) => set({ currentSessionId: id }),

      addSession: (session) => {
        set((state) => ({
          sessions: [session, ...state.sessions.filter(s => s.id !== session.id)],
        }))
      },

      removeSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
        }))
      },

      updateSessionTitle: (id, title) => {
        set((state) => ({
          sessions: state.sessions.map(s =>
            s.id === id ? { ...s, title } : s
          ),
        }))
      },

      // Agents actions
      loadAgents: async () => {
        set({ isLoadingAgents: true, agentsError: null })
        try {
          const agents = await getAgents()
          set({ agents, isLoadingAgents: false })
        } catch (err) {
          set({
            agentsError: (err as Error).message,
            isLoadingAgents: false,
          })
        }
      },

      setAgents: (agents) => set({ agents }),
    }),
    {
      name: 'accio-chat-store',
      partialize: (state) => ({
        // Don't persist sessions - always load from server
        messages: state.messages,
        activeAgents: state.activeAgents,
        isTyping: state.isTyping,
        currentAgent: state.currentAgent,
        tasks: state.tasks,
        currentSessionId: state.currentSessionId,
        // Don't persist agents - always load from server
      }),
    }
  )
)

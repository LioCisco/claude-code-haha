import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Message, Agent, Task } from '@/types'

interface ChatState {
  messages: Message[]
  agents: Agent[]
  activeAgents: string[]
  isTyping: boolean
  currentAgent: Agent | null
  tasks: Task[]

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'> & { id?: string }) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearMessages: () => void
  setTyping: (typing: boolean) => void
  setCurrentAgent: (agent: Agent | null) => void
  toggleAgent: (agentId: string) => void
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateTask: (id: string, updates: Partial<Task>) => void
}

const defaultAgents: Agent[] = [
  {
    id: 'product-researcher',
    name: '选品专员',
    role: '爆款选品总监',
    avatar: '🔍',
    description: '擅长市场趋势分析、竞品调研、1688以图搜货',
    skills: ['market-research', 'product-sourcing', 'trend-analysis'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#22c55e',
  },
  {
    id: 'content-creator',
    name: '内容专员',
    role: '内容生成专员',
    avatar: '✍️',
    description: '自动生成商品描述、AI模特图、营销文案',
    skills: ['copywriting', 'image-generation', 'seo-optimization'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#f97316',
  },
  {
    id: 'store-manager',
    name: '运营专员',
    role: '店铺运营总监',
    avatar: '🏪',
    description: 'Shopify店铺搭建、SEO优化、数据分析',
    skills: ['shopify', 'seo', 'analytics', 'listing-optimization'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#3b82f6',
  },
  {
    id: 'procurement',
    name: '采购专员',
    role: '采购谈判专员',
    avatar: '🤝',
    description: '自动发起RFQ、供应商谈判、订单跟进',
    skills: ['rfq', 'negotiation', 'supplier-management'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#8b5cf6',
  },
  {
    id: 'marketing',
    name: '营销专员',
    role: '社媒营销总监',
    avatar: '📢',
    description: 'Instagram/X/Reddit内容发布、广告投放',
    skills: ['social-media', 'ads', 'content-marketing'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#ec4899',
  },
]

export const useChatStore = create<ChatState>()(
  persist(
    (set, _get) => ({
      messages: [],
      agents: defaultAgents,
      activeAgents: [],
      isTyping: false,
      currentAgent: null,
      tasks: [],

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: message.id || Math.random().toString(36).substring(2, 15),
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
    }),
    {
      name: 'accio-chat-store',
    }
  )
)

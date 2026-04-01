export interface Agent {
  id: string
  name: string
  role: string
  avatar: string
  description: string
  skills: string[]
  status: 'idle' | 'working' | 'error'
  model: string
  color: string
}

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'agent' | 'system'
  agentId?: string
  agentName?: string
  agentAvatar?: string
  timestamp: Date
  attachments?: Attachment[]
  isStreaming?: boolean
}

export interface Attachment {
  id: string
  name: string
  type: string
  url: string
  size: number
}

export interface Skill {
  id: string
  name: string
  description: string
  icon: string
  category: string
  isActive: boolean
  config?: Record<string, unknown>
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  agentId?: string
  createdAt: Date
  updatedAt: Date
}

export interface StoreProject {
  id: string
  name: string
  description: string
  platform: 'shopify' | 'woocommerce' | 'amazon'
  status: 'draft' | 'building' | 'live'
  products: number
  createdAt: Date
  thumbnail?: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  cost: number
  images: string[]
  supplier?: Supplier
  tags: string[]
}

export interface Supplier {
  id: string
  name: string
  rating: number
  location: string
  minOrder: number
  certifications: string[]
}

export interface AnalyticsData {
  date: string
  visitors: number
  orders: number
  revenue: number
  conversion: number
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
  tokens: number
}

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
  systemPrompt?: string
  isActive?: boolean
  isDefault?: boolean
  createdAt?: Date
  updatedAt?: Date
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
  status: 'active' | 'inactive' | 'beta'
  isBuiltIn: boolean

  // 执行配置
  executionType: 'builtin' | 'http' | 'mcp' | 'code' | 'proxy'
  executionConfig?: Record<string, unknown>

  // 参数定义
  configSchema?: Record<string, unknown>

  // 认证配置
  authType: 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer'
  authConfig?: Record<string, unknown>

  // 高级设置
  timeoutMs: number
  retryPolicy?: {
    maxRetries: number
    backoffType: 'fixed' | 'exponential'
    initialDelay: number
  }
  rateLimitPerMinute: number

  // 统计
  usage: number
  successCount?: number
  failCount?: number
  avgExecutionMs?: number

  // 文档
  documentationUrl?: string
  examples?: Record<string, unknown>[]

  createdAt?: Date
  updatedAt?: Date
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
  username: string
  name?: string
  email?: string
  phone?: string
  avatar?: string
  company_name?: string
  display_name?: string
  is_default?: boolean
  plan?: 'free' | 'pro' | 'enterprise'
  tokens?: number
}

// Scheduled Tasks
export type ScheduleType = 'once' | 'daily' | 'interval' | 'cron'

export interface ScheduleConfig {
  type: ScheduleType
  value: string
}

export interface TaskResult {
  id: string
  timestamp: Date
  status: 'success' | 'error' | 'running'
  output?: string
  error?: string
  duration?: number
}

export interface ScheduledTask {
  id: string
  name: string
  description?: string
  agentId: string
  agentName?: string
  sessionId?: string
  prompt: string
  schedule: ScheduleConfig
  enabled: boolean
  createdAt: Date
  updatedAt: Date
  lastRun?: Date
  nextRun?: Date
  totalRuns: number
  successRuns: number
  failRuns: number
  results: TaskResult[]
}

// Settings Types
export interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  marketing: boolean
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
}

export interface SubscriptionInfo {
  plan: 'free' | 'pro' | 'enterprise'
  tokensLimit: number
  tokensUsed: number
  tokensResetAt?: Date
}

export interface UserSettings {
  id: string
  userId: string
  displayName?: string
  email?: string
  phone?: string
  region: string
  avatarUrl?: string
  notifications: NotificationSettings
  security: SecuritySettings
  subscription: SubscriptionInfo
}

export interface UserIntegration {
  id: string
  platform: string
  platformName: string
  icon: string
  isConnected: boolean
  storeUrl?: string
  storeName?: string
  metadata?: Record<string, unknown>
  connectedAt?: Date
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  avatar?: string
  status: 'active' | 'pending' | 'inactive'
  invitedAt: Date
  joinedAt?: Date
}

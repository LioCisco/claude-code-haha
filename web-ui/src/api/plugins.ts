import { apiClient } from './client'

export interface Plugin {
  id: string
  userId?: string
  name: string
  description?: string
  version: string
  author?: string
  icon: string
  category: string
  type: 'builtin' | 'mcp' | 'http' | 'webhook'
  config?: any
  manifest?: PluginManifest
  mcpConfig?: any
  code?: string
  status: 'active' | 'inactive' | 'error'
  isSystem: boolean
  isEnabled: boolean
  usageCount: number
  lastUsedAt?: string
  lastError?: string
  createdAt: string
  updatedAt: string
}

export interface PluginManifest {
  tools?: PluginTool[]
  hooks?: {
    beforeMessage?: string
    afterMessage?: string
    beforeTool?: string
    afterTool?: string
    onError?: string
  }
  uiComponents?: {
    name: string
    type: 'page' | 'widget' | 'toolbar'
    route?: string
  }[]
  permissions?: string[]
}

export interface PluginTool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface PluginCategory {
  id: string
  name: string
  icon: string
  description: string
}

export interface PluginExecution {
  id: string
  toolName?: string
  params?: any
  result?: any
  status: 'success' | 'error' | 'timeout'
  errorMessage?: string
  durationMs?: number
  createdAt: string
}

export const pluginApi = {
  // Get all plugins
  getAll: async (category?: string, status?: string) => {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    if (status) params.append('status', status)
    const response = await apiClient.get(`/api/plugins?${params}`)
    return response as { success: boolean; plugins: Plugin[] }
  },

  // Get single plugin
  getById: async (id: string) => {
    const response = await apiClient.get(`/api/plugins/${id}`)
    return response as { success: boolean; plugin: Plugin }
  },

  // Create plugin
  create: async (data: {
    id?: string
    name: string
    description?: string
    version?: string
    author?: string
    icon?: string
    category?: string
    type?: 'builtin' | 'mcp' | 'http' | 'webhook'
    config?: any
    manifest?: any
    code?: string
    mcpConfig?: any
    status?: string
  }) => {
    const response = await apiClient.post('/api/plugins', data)
    return response as { success: boolean; plugin: Plugin }
  },

  // Update plugin
  update: async (id: string, data: Partial<{
    name: string
    description: string
    version: string
    author: string
    icon: string
    category: string
    config: any
    manifest: any
    code: string
    mcpConfig: any
    status: string
    isEnabled: boolean
  }>) => {
    const response = await apiClient.put(`/api/plugins/${id}`, data)
    return response as { success: boolean; plugin: Plugin }
  },

  // Delete plugin
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/plugins/${id}`)
    return response as { success: boolean; message: string }
  },

  // Toggle plugin status
  toggle: async (id: string, enabled: boolean) => {
    const response = await apiClient.post(`/api/plugins/${id}/toggle`, { enabled })
    return response as { success: boolean; plugin: Plugin }
  },

  // Execute plugin tool
  execute: async (id: string, toolName: string, params?: Record<string, any>, sessionId?: string) => {
    const response = await apiClient.post(`/api/plugins/${id}/execute`, {
      toolName,
      params,
      sessionId,
    })
    return response as {
      success: boolean
      message: string
      result?: any
      durationMs?: number
    }
  },

  // Get plugin execution history
  getHistory: async (id: string, limit?: number) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', String(limit))
    const response = await apiClient.get(`/api/plugins/${id}/history?${params}`)
    return response as { success: boolean; history: PluginExecution[] }
  },

  // Get active tools from all plugins
  getActiveTools: async () => {
    const response = await apiClient.get('/api/plugins/tools/active')
    return response as { success: boolean; tools: PluginTool[] }
  },

  // Get plugin categories
  getCategories: async () => {
    const response = await apiClient.get('/api/plugins/categories/list')
    return response as { success: boolean; categories: PluginCategory[] }
  },

  // Install plugin from template/marketplace
  install: async (data: {
    id?: string
    name: string
    description: string
    version?: string
    author?: string
    icon?: string
    category?: string
    type?: 'builtin' | 'mcp' | 'http' | 'webhook'
    config?: any
    manifest?: any
    code?: string
    mcpConfig?: any
  }) => {
    const response = await apiClient.post('/api/plugins/install', data)
    return response as { success: boolean; plugin: Plugin }
  },
}

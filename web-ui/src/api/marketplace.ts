import { apiClient } from './client'
import type { PluginManifest, PluginTool } from './plugins'

export interface MarketplacePlugin {
  id: string
  name: string
  description?: string
  shortDescription?: string
  version: string
  authorId: string
  authorName?: string
  authorAvatar?: string
  icon: string
  category: string
  type: 'builtin' | 'mcp' | 'http' | 'webhook'
  manifest?: PluginManifest
  screenshots?: string[]
  tags?: string[]
  status: 'pending' | 'approved' | 'rejected' | 'deprecated'
  visibility: 'public' | 'unlisted' | 'private'
  downloadCount: number
  ratingAvg: number
  ratingCount: number
  installCount: number
  localPluginId?: string
  isInstalled?: boolean
  readme?: string
  createdAt: string
  updatedAt: string
}

export interface PluginReview {
  id: string
  marketplacePluginId: string
  userId: string
  username?: string
  displayName?: string
  avatarUrl?: string
  rating: number
  review?: string
  isRecommended: boolean
  helpfulCount: number
  createdAt: string
  updatedAt: string
}

export interface PluginCategory {
  id: string
  name: string
  icon: string
  count: number
}

export interface PluginGenerationRequest {
  name: string
  description: string
  category: string
  tools: Array<{
    name: string
    description: string
    parameters: Array<{
      name: string
      type: string
      description: string
      required?: boolean
    }>
  }>
  requirements?: string[]
}

export const marketplaceApi = {
  // Get all marketplace plugins
  getPlugins: async (params?: {
    category?: string
    sort?: 'popular' | 'newest' | 'rating' | 'name'
    search?: string
    page?: number
    limit?: number
  }) => {
    const query = new URLSearchParams()
    if (params?.category) query.append('category', params.category)
    if (params?.sort) query.append('sort', params.sort)
    if (params?.search) query.append('search', params.search)
    if (params?.page) query.append('page', String(params.page))
    if (params?.limit) query.append('limit', String(params.limit))

    const response = await apiClient.get(`/api/marketplace/plugins?${query}`)
    return response as {
      success: boolean
      plugins: MarketplacePlugin[]
      page: number
      limit: number
    }
  },

  // Get single plugin
  getPlugin: async (id: string) => {
    const response = await apiClient.get(`/api/marketplace/plugins/${id}`)
    return response as { success: boolean; plugin: MarketplacePlugin }
  },

  // Get plugin reviews
  getReviews: async (id: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : ''
    const response = await apiClient.get(`/api/marketplace/plugins/${id}/reviews${query}`)
    return response as { success: boolean; reviews: PluginReview[] }
  },

  // Install plugin
  install: async (id: string) => {
    const response = await apiClient.post(`/api/marketplace/plugins/${id}/install`, {})
    return response as {
      success: boolean
      message: string
      localPluginId: string
    }
  },

  // Uninstall plugin
  uninstall: async (id: string) => {
    const response = await apiClient.post(`/api/marketplace/plugins/${id}/uninstall`, {})
    return response as { success: boolean; message: string }
  },

  // Rate plugin
  rate: async (
    id: string,
    data: { rating: number; review?: string; isRecommended?: boolean }
  ) => {
    const response = await apiClient.post(`/api/marketplace/plugins/${id}/rate`, data)
    return response as { success: boolean; message: string }
  },

  // Publish plugin
  publish: async (data: {
    name: string
    description: string
    shortDescription?: string
    version?: string
    icon?: string
    category: string
    type?: 'builtin' | 'mcp' | 'http' | 'webhook'
    manifest: PluginManifest
    code?: string
    mcpConfig?: any
    readme?: string
    tags?: string[]
    screenshots?: string[]
  }) => {
    const response = await apiClient.post('/api/marketplace/publish', data)
    return response as { success: boolean; message: string; pluginId: string }
  },

  // Get my installed plugins
  getMyPlugins: async () => {
    const response = await apiClient.get('/api/marketplace/my-plugins')
    return response as { success: boolean; plugins: any[] }
  },

  // Get recommendations
  getRecommendations: async () => {
    const response = await apiClient.get('/api/marketplace/recommendations')
    return response as {
      success: boolean
      recommendations: Array<{
        id: string
        reason: string
        confidence: number
      }>
    }
  },

  // Get categories
  getCategories: async () => {
    const response = await apiClient.get('/api/marketplace/categories')
    return response as { success: boolean; categories: PluginCategory[] }
  },

  // Get featured plugins
  getFeatured: async () => {
    const response = await apiClient.get('/api/marketplace/featured')
    return response as { success: boolean; plugins: MarketplacePlugin[] }
  },

  // ================== AI Features ==================

  // Generate plugin code with AI
  aiGenerate: async (request: PluginGenerationRequest) => {
    const response = await apiClient.post('/api/marketplace/ai/generate', request)
    return response as {
      success: boolean
      manifest: PluginManifest
      code: string
      explanation: string
    }
  },

  // Enhance plugin with AI
  aiEnhance: async (data: {
    currentCode: string
    currentManifest: PluginManifest
    enhancementRequest: string
  }) => {
    const response = await apiClient.post('/api/marketplace/ai/enhance', data)
    return response as {
      success: boolean
      manifest: PluginManifest
      code: string
      explanation: string
    }
  },

  // Generate description with AI
  aiDescribe: async (name: string, tools: PluginTool[]) => {
    const response = await apiClient.post('/api/marketplace/ai/describe', {
      name,
      tools,
    })
    return response as {
      success: boolean
      shortDescription: string
      fullDescription: string
      readme: string
    }
  },

  // Review code with AI
  aiReview: async (code: string, manifest: PluginManifest) => {
    const response = await apiClient.post('/api/marketplace/ai/review', {
      code,
      manifest,
    })
    return response as {
      success: boolean
      score: number
      issues: Array<{
        severity: 'error' | 'warning' | 'info'
        message: string
        line?: number
      }>
      suggestions: string[]
    }
  },

  // Generate from natural language
  aiNaturalLanguage: async (description: string) => {
    const response = await apiClient.post('/api/marketplace/ai/natural-language', {
      description,
    })
    return response as {
      success: boolean
      name: string
      category: string
      tools: Array<{
        name: string
        description: string
        parameters: any[]
      }>
      manifest: PluginManifest
      code: string
    }
  },
}

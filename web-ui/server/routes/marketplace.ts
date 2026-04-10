import { Elysia, t } from 'elysia'
import {
  getMarketplacePlugins,
  getMarketplacePluginById,
  searchMarketplacePlugins,
  installPluginFromMarketplace,
  rateMarketplacePlugin,
  publishPluginToMarketplace,
  getUserInstalledPlugins,
  uninstallMarketplacePlugin,
  getRecommendedPlugins,
  incrementPluginDownload,
  getPluginReviews,
} from '../db'
import {
  generatePluginCode,
  enhancePlugin,
  generatePluginDescription,
  getPluginRecommendations,
  reviewPluginCode,
  generatePluginFromNaturalLanguage,
} from '../lib/anthropicService'
import { loadPlugin } from '../lib/pluginEngine'

// Parse JSON helper
function parseJson(value: any): any {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

// Convert DB row to Marketplace Plugin object
function dbRowToMarketplacePlugin(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    shortDescription: row.short_description,
    version: row.version,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    icon: row.icon,
    category: row.category,
    type: row.type,
    manifest: parseJson(row.manifest),
    screenshots: parseJson(row.screenshots),
    tags: parseJson(row.tags),
    status: row.status,
    visibility: row.visibility,
    downloadCount: row.download_count,
    ratingAvg: parseFloat(row.rating_avg),
    ratingCount: row.rating_count,
    installCount: row.install_count,
    localPluginId: row.local_plugin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const marketplaceRoutes = new Elysia({ prefix: '/api/marketplace' })
  // Get all marketplace plugins (with filters)
  .get('/plugins', async ({ query, request }) => {
    const userId = (request as any).user?.id || 'default-user'
    const {
      category,
      sort = 'popular',
      search,
      page = '1',
      limit = '20',
    } = query

    const pageNum = parseInt(page as string) || 1
    const limitNum = Math.min(parseInt(limit as string) || 20, 100)

    try {
      if (search) {
        const rows = await searchMarketplacePlugins(
          search as string,
          category as string | undefined,
          sort as string,
          pageNum,
          limitNum
        )
        return {
          success: true,
          plugins: rows.map(dbRowToMarketplacePlugin),
          page: pageNum,
          limit: limitNum,
        }
      } else {
        const rows = await getMarketplacePlugins(
          category as string | undefined,
          sort as string,
          pageNum,
          limitNum
        )
        return {
          success: true,
          plugins: rows.map(dbRowToMarketplacePlugin),
          page: pageNum,
          limit: limitNum,
        }
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

  // Get single marketplace plugin
  .get('/plugins/:id', async ({ params, request }) => {
    const userId = (request as any).user?.id || 'default-user'
    try {
      const row = await getMarketplacePluginById(params.id)
      if (!row) {
        return { success: false, message: 'Plugin not found' }
      }

      // Check if user has installed this plugin
      const installed = await getUserInstalledPlugins(userId)
      const isInstalled = installed.some(
        (i: any) => i.marketplace_plugin_id === params.id
      )

      // Increment download/view count
      await incrementPluginDownload(params.id, userId, 'view')

      return {
        success: true,
        plugin: {
          ...dbRowToMarketplacePlugin(row),
          readme: row.readme,
          isInstalled,
        },
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

  // Get plugin reviews
  .get('/plugins/:id/reviews', async ({ params, query }) => {
    const limit = parseInt(query.limit as string) || 20
    try {
      const reviews = await getPluginReviews(params.id, limit)
      return { success: true, reviews }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

  // Install plugin from marketplace
  .post('/plugins/:id/install', async ({ params, request }) => {
    const userId = (request as any).user?.id || 'default-user'
    try {
      // Get marketplace plugin
      const marketPlugin = await getMarketplacePluginById(params.id)
      if (!marketPlugin) {
        return { success: false, message: 'Plugin not found in marketplace' }
      }

      // Install to local plugins
      const localPluginId = await installPluginFromMarketplace(
        params.id,
        userId,
        {
          name: marketPlugin.name,
          description: marketPlugin.description,
          version: marketPlugin.version,
          icon: marketPlugin.icon,
          category: marketPlugin.category,
          type: marketPlugin.type,
          manifest: parseJson(marketPlugin.manifest),
          code: marketPlugin.code,
          mcpConfig: parseJson(marketPlugin.mcp_config),
        }
      )

      // Load the plugin
      await loadPlugin(localPluginId)

      // Increment download count
      await incrementPluginDownload(params.id, userId, 'install')

      return {
        success: true,
        message: 'Plugin installed successfully',
        localPluginId,
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

  // Uninstall marketplace plugin
  .post('/plugins/:id/uninstall', async ({ params, request }) => {
    const userId = (request as any).user?.id || 'default-user'
    try {
      await uninstallMarketplacePlugin(params.id, userId)
      return { success: true, message: 'Plugin uninstalled' }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

  // Rate a plugin
  .post('/plugins/:id/rate', async ({ params, body, request }) => {
    const userId = (request as any).user?.id || 'default-user'
    try {
      await rateMarketplacePlugin(params.id, userId, {
        rating: body.rating,
        review: body.review,
        isRecommended: body.isRecommended,
      })
      return { success: true, message: 'Rating submitted' }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      rating: t.Number(),
      review: t.Optional(t.String()),
      isRecommended: t.Optional(t.Boolean()),
    }),
  })

  // Publish plugin to marketplace
  .post('/publish', async ({ body, request }) => {
    const userId = (request as any).user?.id || 'default-user'
    const userName = (request as any).user?.username || 'Anonymous'

    try {
      const pluginId = await publishPluginToMarketplace({
        name: body.name,
        description: body.description,
        shortDescription: body.shortDescription,
        version: body.version || '1.0.0',
        authorId: userId,
        authorName: userName,
        icon: body.icon,
        category: body.category,
        type: body.type || 'builtin',
        manifest: body.manifest,
        code: body.code,
        mcpConfig: body.mcpConfig,
        readme: body.readme,
        tags: body.tags,
        screenshots: body.screenshots,
      })

      return {
        success: true,
        message: 'Plugin submitted for review',
        pluginId,
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.String(),
      shortDescription: t.Optional(t.String()),
      version: t.Optional(t.String()),
      icon: t.Optional(t.String()),
      category: t.String(),
      type: t.Optional(t.String()),
      manifest: t.Record(t.String(), t.Any()),
      code: t.Optional(t.String()),
      mcpConfig: t.Optional(t.Record(t.String(), t.Any())),
      readme: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
      screenshots: t.Optional(t.Array(t.String())),
    }),
  })

  // Get user's installed plugins
  .get('/my-plugins', async ({ request }) => {
    const userId = (request as any).user?.id || 'default-user'
    try {
      const rows = await getUserInstalledPlugins(userId)
      return { success: true, plugins: rows }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

  // Get recommended plugins
  .get('/recommendations', async ({ request }) => {
    const userId = (request as any).user?.id || 'default-user'
    try {
      const recommendations = await getRecommendedPlugins(userId)
      return { success: true, recommendations }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

  // ================== Anthropic AI Features ==================

  // AI Generate Plugin Code
  .post('/ai/generate', async ({ body, request }) => {
    try {
      const result = await generatePluginCode({
        name: body.name,
        description: body.description,
        category: body.category,
        tools: body.tools,
        requirements: body.requirements,
      })

      return { success: true, ...result }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.String(),
      category: t.String(),
      tools: t.Array(t.Object({
        name: t.String(),
        description: t.String(),
        parameters: t.Array(t.Object({
          name: t.String(),
          type: t.String(),
          description: t.String(),
          required: t.Optional(t.Boolean()),
        })),
      })),
      requirements: t.Optional(t.Array(t.String())),
    }),
  })

  // AI Enhance Plugin
  .post('/ai/enhance', async ({ body }) => {
    try {
      const result = await enhancePlugin({
        currentCode: body.currentCode,
        currentManifest: body.currentManifest,
        enhancementRequest: body.enhancementRequest,
      })

      return { success: true, ...result }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      currentCode: t.String(),
      currentManifest: t.Record(t.String(), t.Any()),
      enhancementRequest: t.String(),
    }),
  })

  // AI Generate Description
  .post('/ai/describe', async ({ body }) => {
    try {
      const result = await generatePluginDescription(body.name, body.tools)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      name: t.String(),
      tools: t.Array(t.Record(t.String(), t.Any())),
    }),
  })

  // AI Code Review
  .post('/ai/review', async ({ body }) => {
    try {
      const result = await reviewPluginCode(body.code, body.manifest)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      code: t.String(),
      manifest: t.Record(t.String(), t.Any()),
    }),
  })

  // Natural Language to Plugin
  .post('/ai/natural-language', async ({ body }) => {
    try {
      const result = await generatePluginFromNaturalLanguage(body.description)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      description: t.String(),
    }),
  })

  // Get categories
  .get('/categories', async () => {
    return {
      success: true,
      categories: [
        { id: 'utility', name: '实用工具', icon: 'Wrench', count: 0 },
        { id: 'integration', name: '集成服务', icon: 'Plug', count: 0 },
        { id: 'automation', name: '自动化', icon: 'Zap', count: 0 },
        { id: 'ai', name: 'AI 增强', icon: 'Brain', count: 0 },
        { id: 'dev', name: '开发工具', icon: 'Code', count: 0 },
        { id: 'data', name: '数据处理', icon: 'Database', count: 0 },
      ],
    }
  })

  // Get featured plugins
  .get('/featured', async () => {
    try {
      const rows = await getMarketplacePlugins(undefined, 'popular', 1, 6)
      return {
        success: true,
        plugins: rows.map(dbRowToMarketplacePlugin),
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  })

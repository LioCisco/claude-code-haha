import { Elysia, t } from 'elysia'
import {
  getAllPlugins,
  getPluginById,
  createPlugin,
  updatePlugin,
  deletePlugin,
  togglePluginStatus,
  getPluginExecutions,
  execute,
} from '../db'
import { executePluginTool, getActivePluginTools, loadPlugin, unloadPlugin } from '../lib/pluginEngine'

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

// Convert DB row to Plugin object
function dbRowToPlugin(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    version: row.version,
    author: row.author,
    icon: row.icon,
    category: row.category,
    type: row.type,
    config: parseJson(row.config),
    manifest: parseJson(row.manifest),
    mcpConfig: parseJson(row.mcp_config),
    status: row.status,
    isSystem: row.is_system === 1,
    isEnabled: row.is_enabled === 1,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const pluginRoutes = new Elysia({ prefix: '/api/plugins' })
  // Get all plugins
  .get('/', async ({ query, request }) => {
    const userId = (request as any).user?.id || 'default-user'
    const category = query.category as string | undefined
    const status = query.status as string | undefined

    const rows = await getAllPlugins(userId, category, status)
    const plugins = rows.map(dbRowToPlugin)
    return { success: true, plugins }
  })

  // Get single plugin
  .get('/:id', async ({ params, set }) => {
    const row = await getPluginById(params.id)
    if (!row) {
      set.status = 404
      return { success: false, message: 'Plugin not found' }
    }
    return { success: true, plugin: dbRowToPlugin(row) }
  })

  // Create new plugin
  .post('/', async ({ body, request, set }) => {
    try {
      const userId = (request as any).user?.id || 'default-user'
      const pluginId = body.id || `plugin-${Date.now()}`

      await createPlugin({
        id: pluginId,
        userId,
        name: body.name,
        description: body.description,
        version: body.version || '1.0.0',
        author: body.author,
        icon: body.icon || 'Puzzle',
        category: body.category || 'utility',
        type: body.type || 'builtin',
        config: body.config,
        manifest: body.manifest,
        code: body.code,
        mcpConfig: body.mcpConfig,
      })

      // Load plugin into engine if active
      if (body.status === 'active') {
        await loadPlugin(pluginId)
      }

      const row = await getPluginById(pluginId)
      return { success: true, plugin: dbRowToPlugin(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      id: t.Optional(t.String()),
      name: t.String(),
      description: t.String(),
      version: t.Optional(t.String()),
      author: t.Optional(t.String()),
      icon: t.Optional(t.String()),
      category: t.Optional(t.String()),
      type: t.Optional(t.String()),
      config: t.Optional(t.Record(t.String(), t.Any())),
      manifest: t.Optional(t.Record(t.String(), t.Any())),
      code: t.Optional(t.String()),
      mcpConfig: t.Optional(t.Record(t.String(), t.Any())),
      status: t.Optional(t.String()),
    })
  })

  // Update plugin
  .put('/:id', async ({ params, body, set }) => {
    try {
      const existing = await getPluginById(params.id)
      if (!existing) {
        set.status = 404
        return { success: false, message: 'Plugin not found' }
      }

      // Prevent modification of system plugins (except status)
      if (existing.is_system === 1 && body.status === undefined && body.isEnabled === undefined) {
        set.status = 403
        return { success: false, message: 'Cannot modify system plugins' }
      }

      await updatePlugin(params.id, {
        name: body.name,
        description: body.description,
        version: body.version,
        author: body.author,
        icon: body.icon,
        category: body.category,
        config: body.config,
        manifest: body.manifest,
        code: body.code,
        mcpConfig: body.mcpConfig,
        status: body.status,
        isEnabled: body.isEnabled,
      })

      // Reload plugin in engine if config changed
      if (body.code !== undefined || body.manifest !== undefined || body.mcpConfig !== undefined) {
        await unloadPlugin(params.id)
        if (body.status === 'active' || (body.status === undefined && existing.status === 'active')) {
          await loadPlugin(params.id)
        }
      }

      const row = await getPluginById(params.id)
      return { success: true, plugin: dbRowToPlugin(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      version: t.Optional(t.String()),
      author: t.Optional(t.String()),
      icon: t.Optional(t.String()),
      category: t.Optional(t.String()),
      config: t.Optional(t.Record(t.String(), t.Any())),
      manifest: t.Optional(t.Record(t.String(), t.Any())),
      code: t.Optional(t.String()),
      mcpConfig: t.Optional(t.Record(t.String(), t.Any())),
      status: t.Optional(t.String()),
      isEnabled: t.Optional(t.Boolean()),
    })
  })

  // Delete plugin
  .delete('/:id', async ({ params, set }) => {
    try {
      const existing = await getPluginById(params.id)
      if (!existing) {
        set.status = 404
        return { success: false, message: 'Plugin not found' }
      }

      if (existing.is_system === 1) {
        set.status = 403
        return { success: false, message: 'Cannot delete system plugins' }
      }

      // Unload from engine
      await unloadPlugin(params.id)

      await deletePlugin(params.id)
      return { success: true, message: 'Plugin deleted' }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  })

  // Toggle plugin status (active/inactive)
  .post('/:id/toggle', async ({ params, body, set }) => {
    try {
      const newStatus = body.enabled ? 'active' : 'inactive'
      await togglePluginStatus(params.id, newStatus)

      // Load/unload from engine
      if (body.enabled) {
        await loadPlugin(params.id)
      } else {
        await unloadPlugin(params.id)
      }

      const row = await getPluginById(params.id)
      return { success: true, plugin: dbRowToPlugin(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      enabled: t.Boolean()
    })
  })

  // Execute plugin tool
  .post('/:id/execute', async ({ params, body, request, set }) => {
    try {
      const userId = (request as any).user?.id || 'default-user'
      const sessionId = body.sessionId as string | undefined

      const result = await executePluginTool(params.id, body.toolName as string, body.params || {}, {
        userId,
        sessionId,
      })

      if (!result.success) {
        set.status = 400
        return {
          success: false,
          message: result.error,
          durationMs: result.durationMs,
        }
      }

      return {
        success: true,
        message: 'Plugin executed successfully',
        result: result.data,
        durationMs: result.durationMs,
      }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      toolName: t.String(),
      params: t.Optional(t.Record(t.String(), t.Any())),
      sessionId: t.Optional(t.String()),
    })
  })

  // Get plugin execution history
  .get('/:id/history', async ({ params, query, set }) => {
    try {
      const limit = parseInt(query.limit as string || '50')
      const rows = await getPluginExecutions(params.id, limit)

      const history = rows.map((row: any) => ({
        id: row.id,
        toolName: row.tool_name,
        params: parseJson(row.params),
        result: parseJson(row.result),
        status: row.status,
        errorMessage: row.error_message,
        durationMs: row.duration_ms,
        createdAt: row.created_at,
      }))

      return { success: true, history }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  })

  // Get available tools from all active plugins (for Claude Code)
  .get('/tools/active', async ({ request }) => {
    const userId = (request as any).user?.id || 'default-user'
    const tools = await getActivePluginTools(userId)
    return { success: true, tools }
  })

  // Install plugin from marketplace/template
  .post('/install', async ({ body, request, set }) => {
    try {
      const userId = (request as any).user?.id || 'default-user'
      const pluginId = body.id || `plugin-${Date.now()}`

      await createPlugin({
        id: pluginId,
        userId,
        name: body.name,
        description: body.description,
        version: body.version || '1.0.0',
        author: body.author || userId,
        icon: body.icon || 'Puzzle',
        category: body.category || 'utility',
        type: body.type || 'builtin',
        config: body.config,
        manifest: body.manifest,
        code: body.code,
        mcpConfig: body.mcpConfig,
        status: 'inactive',
      })

      const row = await getPluginById(pluginId)
      return { success: true, plugin: dbRowToPlugin(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      id: t.Optional(t.String()),
      name: t.String(),
      description: t.String(),
      version: t.Optional(t.String()),
      author: t.Optional(t.String()),
      icon: t.Optional(t.String()),
      category: t.Optional(t.String()),
      type: t.Optional(t.String()),
      config: t.Optional(t.Record(t.String(), t.Any())),
      manifest: t.Optional(t.Record(t.String(), t.Any())),
      code: t.Optional(t.String()),
      mcpConfig: t.Optional(t.Record(t.String(), t.Any())),
    })
  })

  // Get plugin categories
  .get('/categories/list', async () => {
    return {
      success: true,
      categories: [
        { id: 'utility', name: '实用工具', icon: 'Wrench', description: '通用工具类插件' },
        { id: 'integration', name: '集成服务', icon: 'Plug', description: '第三方服务集成' },
        { id: 'automation', name: '自动化', icon: 'Zap', description: '自动化工作流插件' },
        { id: 'ai', name: 'AI 增强', icon: 'Brain', description: 'AI 功能增强插件' },
        { id: 'dev', name: '开发工具', icon: 'Code', description: '开发者工具插件' },
        { id: 'custom', name: '自定义', icon: 'Palette', description: '用户自定义插件' },
      ]
    }
  })

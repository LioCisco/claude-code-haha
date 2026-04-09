import { Elysia, t } from 'elysia'
import { getAllSkills, getSkillById, execute } from '../db'
import { executeSkill, registerBuiltinHandler } from '../lib/skillExecutor'

// Icon 映射
const iconMap: Record<string, string> = {
  ShoppingCart: 'ShoppingCart',
  FileText: 'FileText',
  Image: 'Image',
  Globe: 'Globe',
  MessageSquare: 'MessageSquare',
  BarChart3: 'BarChart3',
  Database: 'Database',
  Shield: 'Shield',
  Zap: 'Zap',
  TrendingUp: 'TrendingUp',
  Code: 'Code',
  Wrench: 'Wrench',
  Palette: 'Palette',
  Search: 'Search',
  Share2: 'Share2',
  Target: 'Target',
  Users: 'Users',
  Building: 'Building',
  PenTool: 'PenTool',
}

// Convert DB row to Skill object
function dbRowToSkill(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    category: row.category,
    status: row.status,
    isBuiltIn: row.is_built_in === 1,

    // 执行配置
    executionType: row.execution_type,
    executionConfig: parseJson(row.execution_config),

    // 参数定义
    configSchema: parseJson(row.config_schema),

    // 认证
    authType: row.auth_type,

    // 高级设置
    timeoutMs: row.timeout_ms,
    retryPolicy: parseJson(row.retry_policy),
    rateLimitPerMinute: row.rate_limit_per_minute,

    // 统计
    usage: row.usage_count,
    successCount: row.success_count,
    failCount: row.fail_count,
    avgExecutionMs: row.avg_execution_ms,

    // 文档
    documentationUrl: row.documentation_url,
    examples: parseJson(row.examples),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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

export const skillRoutes = new Elysia({ prefix: '/api/skills' })
  // Get all skills
  .get('/', async ({ query }) => {
    const category = query.category as string | undefined
    const rows = await getAllSkills(category)
    const skills = rows.map(dbRowToSkill)
    return { success: true, skills }
  })

  // Get single skill
  .get('/:id', async ({ params, set }) => {
    const row = await getSkillById(params.id)
    if (!row) {
      set.status = 404
      return { success: false, message: 'Skill not found' }
    }
    return { success: true, skill: dbRowToSkill(row) }
  })

  // Update skill configuration
  .put('/:id', async ({ params, body, set }) => {
    try {
      const updates: string[] = []
      const values: any[] = []

      if (body.executionType !== undefined) {
        updates.push('execution_type = ?')
        values.push(body.executionType)
      }
      if (body.executionConfig !== undefined) {
        updates.push('execution_config = ?')
        values.push(JSON.stringify(body.executionConfig))
      }
      if (body.authType !== undefined) {
        updates.push('auth_type = ?')
        values.push(body.authType)
      }
      if (body.authConfig !== undefined) {
        updates.push('auth_config = ?')
        values.push(JSON.stringify(body.authConfig))
      }
      if (body.timeoutMs !== undefined) {
        updates.push('timeout_ms = ?')
        values.push(body.timeoutMs)
      }
      if (body.retryPolicy !== undefined) {
        updates.push('retry_policy = ?')
        values.push(JSON.stringify(body.retryPolicy))
      }
      if (body.rateLimitPerMinute !== undefined) {
        updates.push('rate_limit_per_minute = ?')
        values.push(body.rateLimitPerMinute)
      }
      if (body.configSchema !== undefined) {
        updates.push('config_schema = ?')
        values.push(JSON.stringify(body.configSchema))
      }
      if (body.documentationUrl !== undefined) {
        updates.push('documentation_url = ?')
        values.push(body.documentationUrl)
      }
      if (body.examples !== undefined) {
        updates.push('examples = ?')
        values.push(JSON.stringify(body.examples))
      }
      if (body.status !== undefined) {
        updates.push('status = ?')
        values.push(body.status)
      }

      if (updates.length === 0) {
        return { success: true, message: 'No changes' }
      }

      updates.push('updated_at = NOW()')
      values.push(params.id)

      await execute(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`, values)

      const row = await getSkillById(params.id)
      return { success: true, skill: dbRowToSkill(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      executionType: t.Optional(t.String()),
      executionConfig: t.Optional(t.Record(t.String(), t.Any())),
      authType: t.Optional(t.String()),
      authConfig: t.Optional(t.Record(t.String(), t.Any())),
      timeoutMs: t.Optional(t.Number()),
      retryPolicy: t.Optional(t.Record(t.String(), t.Any())),
      rateLimitPerMinute: t.Optional(t.Number()),
      configSchema: t.Optional(t.Record(t.String(), t.Any())),
      documentationUrl: t.Optional(t.String()),
      examples: t.Optional(t.Array(t.Record(t.String(), t.Any()))),
      status: t.Optional(t.String()),
    })
  })

  // Execute skill
  .post('/:id/execute', async ({ params, body, set, request }) => {
    try {
      // 获取 agentId 和 sessionId（从 header 或 body）
      const agentId = body.agentId as string | undefined
      const sessionId = body.sessionId as string | undefined

      const result = await executeSkill(params.id, body.params || {}, {
        agentId,
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
        message: `技能执行成功`,
        result: result.data,
        durationMs: result.durationMs,
      }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      params: t.Optional(t.Record(t.String(), t.Any())),
      agentId: t.Optional(t.String()),
      sessionId: t.Optional(t.String()),
    })
  })

  // Get skill execution history
  .get('/:id/history', async ({ params, query, set }) => {
    try {
      const limit = parseInt(query.limit as string || '50')
      const rows = await getSkillById(params.id) // 需要先实现查询历史的方法

      // 这里应该查询 skill_executions 表
      return { success: true, history: [] }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  })

  // Install skill from marketplace/config
  .post('/install', async ({ body, set }) => {
    try {
      const skillId = body.id || `skill-${Date.now()}`

      await execute(`
        INSERT INTO skills (
          id, name, description, icon, category, status, is_built_in,
          execution_type, execution_config, config_schema, auth_type, auth_config,
          timeout_ms, retry_policy, rate_limit_per_minute, documentation_url, examples
        ) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        skillId,
        body.name,
        body.description,
        body.icon || 'Wrench',
        body.category,
        body.status || 'active',
        body.executionType || 'builtin',
        JSON.stringify(body.executionConfig || {}),
        JSON.stringify(body.configSchema || {}),
        body.authType || 'none',
        JSON.stringify(body.authConfig || {}),
        body.timeoutMs || 30000,
        JSON.stringify(body.retryPolicy || { maxRetries: 0 }),
        body.rateLimitPerMinute || 60,
        body.documentationUrl || null,
        JSON.stringify(body.examples || []),
      ])

      const row = await getSkillById(skillId)
      return { success: true, skill: dbRowToSkill(row!) }
    } catch (err) {
      set.status = 400
      return { success: false, message: (err as Error).message }
    }
  }, {
    body: t.Object({
      id: t.Optional(t.String()),
      name: t.String(),
      description: t.String(),
      icon: t.Optional(t.String()),
      category: t.String(),
      status: t.Optional(t.String()),
      executionType: t.Optional(t.String()),
      executionConfig: t.Optional(t.Record(t.String(), t.Any())),
      configSchema: t.Optional(t.Record(t.String(), t.Any())),
      authType: t.Optional(t.String()),
      authConfig: t.Optional(t.Record(t.String(), t.Any())),
      timeoutMs: t.Optional(t.Number()),
      retryPolicy: t.Optional(t.Record(t.String(), t.Any())),
      rateLimitPerMinute: t.Optional(t.Number()),
      documentationUrl: t.Optional(t.String()),
      examples: t.Optional(t.Array(t.Record(t.String(), t.Any()))),
    })
  })

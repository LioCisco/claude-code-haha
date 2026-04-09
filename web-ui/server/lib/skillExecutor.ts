import { query, execute } from '../db'

export type ExecutionType = 'builtin' | 'http' | 'mcp' | 'code' | 'proxy'
export type AuthType = 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer'

export interface SkillConfig {
  id: string
  name: string
  executionType: ExecutionType
  executionConfig: Record<string, unknown>
  authType: AuthType
  authConfig: Record<string, unknown>
  timeoutMs: number
  retryPolicy: {
    maxRetries: number
    backoffType: 'fixed' | 'exponential'
    initialDelay: number
  }
  rateLimitPerMinute: number
}

export interface SkillExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  durationMs: number
}

// 技能执行器注册表
const builtinHandlers = new Map<string, Function>()

// 注册内置技能处理器
export function registerBuiltinHandler(skillId: string, handler: Function) {
  builtinHandlers.set(skillId, handler)
}

// 获取技能配置
async function getSkillConfig(skillId: string): Promise<SkillConfig | null> {
  const row = await query(`
    SELECT id, name, execution_type, execution_config, auth_type, auth_config,
           timeout_ms, retry_policy, rate_limit_per_minute
    FROM skills WHERE id = ? AND status = 'active'
  `, [skillId]).then(rows => rows[0] as any)

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    executionType: row.execution_type,
    executionConfig: parseJson(row.execution_config),
    authType: row.auth_type,
    authConfig: parseJson(row.auth_config),
    timeoutMs: row.timeout_ms,
    retryPolicy: parseJson(row.retry_policy),
    rateLimitPerMinute: row.rate_limit_per_minute,
  }
}

function parseJson(value: any): any {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  return value
}

// HTTP 执行器
async function executeHttp(
  config: SkillConfig,
  params: Record<string, unknown>
): Promise<SkillExecutionResult> {
  const { url, method = 'POST', headers = {} } = config.executionConfig

  if (!url) {
    throw new Error('HTTP execution requires url in execution_config')
  }

  // 构建认证头
  const authHeaders = buildAuthHeaders(config)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    const response = await fetch(url as string, {
      method: method as string,
      headers: {
        'Content-Type': 'application/json',
        ...headers as Record<string, string>,
        ...authHeaders,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      success: true,
      data,
      durationMs: 0, // 会被外层计算
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// 构建认证头
function buildAuthHeaders(config: SkillConfig): Record<string, string> {
  switch (config.authType) {
    case 'api_key':
      const { headerName = 'X-API-Key', apiKey } = config.authConfig
      return { [headerName as string]: apiKey as string }

    case 'bearer':
      return { 'Authorization': `Bearer ${config.authConfig.token}` }

    case 'basic':
      const { username, password } = config.authConfig
      const base64 = Buffer.from(`${username}:${password}`).toString('base64')
      return { 'Authorization': `Basic ${base64}` }

    default:
      return {}
  }
}

// MCP 执行器（预留）
async function executeMcp(
  config: SkillConfig,
  params: Record<string, unknown>
): Promise<SkillExecutionResult> {
  // MCP 协议执行 - 需要接入 MCP 客户端
  throw new Error('MCP execution not yet implemented')
}

// 代码执行器（预留 - 需要沙箱环境）
async function executeCode(
  config: SkillConfig,
  params: Record<string, unknown>
): Promise<SkillExecutionResult> {
  const { code } = config.executionConfig
  if (!code) {
    throw new Error('Code execution requires code in execution_config')
  }

  // 注意：实际生产环境需要安全的沙箱执行环境
  // 这里仅作演示，不应该直接执行不受信任的代码
  throw new Error('Code execution requires sandbox environment')
}

// Proxy 执行器 - 转发到代理服务
async function executeProxy(
  config: SkillConfig,
  params: Record<string, unknown>
): Promise<SkillExecutionResult> {
  const { proxyUrl } = config.executionConfig
  if (!proxyUrl) {
    throw new Error('Proxy execution requires proxyUrl in execution_config')
  }

  return executeHttp({
    ...config,
    executionConfig: { ...config.executionConfig, url: proxyUrl }
  }, params)
}

// 内置执行器
async function executeBuiltin(
  config: SkillConfig,
  params: Record<string, unknown>
): Promise<SkillExecutionResult> {
  const handler = builtinHandlers.get(config.id)
  if (!handler) {
    throw new Error(`No builtin handler registered for skill: ${config.id}`)
  }

  const result = await handler(params, config)
  return {
    success: true,
    data: result,
    durationMs: 0,
  }
}

// 重试逻辑
async function executeWithRetry(
  executor: () => Promise<SkillExecutionResult>,
  retryPolicy: SkillConfig['retryPolicy']
): Promise<SkillExecutionResult> {
  const { maxRetries = 0, backoffType = 'fixed', initialDelay = 1000 } = retryPolicy || {}

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executor()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        const delay = backoffType === 'exponential'
          ? initialDelay * Math.pow(2, attempt)
          : initialDelay

        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 记录执行日志
async function logExecution(
  skillId: string,
  status: 'success' | 'error' | 'timeout' | 'cancelled',
  params: Record<string, unknown>,
  result: unknown,
  errorMessage: string | null,
  durationMs: number,
  agentId?: string,
  sessionId?: string
): Promise<void> {
  const id = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  await execute(`
    INSERT INTO skill_executions (id, skill_id, agent_id, session_id, params, result, status, error_message, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    skillId,
    agentId || null,
    sessionId || null,
    JSON.stringify(params),
    result ? JSON.stringify(result) : null,
    status,
    errorMessage,
    durationMs,
  ])

  // 更新技能统计
  await execute(`
    UPDATE skills SET
      usage_count = usage_count + 1,
      ${status === 'success' ? 'success_count = success_count + 1' : 'fail_count = fail_count + 1'},
      avg_execution_ms = (avg_execution_ms * usage_count + ?) / (usage_count + 1),
      updated_at = NOW()
    WHERE id = ?
  `, [durationMs, skillId])
}

// 主执行函数
export async function executeSkill(
  skillId: string,
  params: Record<string, unknown>,
  options: {
    agentId?: string
    sessionId?: string
    skipLog?: boolean
  } = {}
): Promise<SkillExecutionResult> {
  const startTime = Date.now()

  try {
    // 获取技能配置
    const config = await getSkillConfig(skillId)
    if (!config) {
      throw new Error(`Skill not found or inactive: ${skillId}`)
    }

    // 执行技能
    let result: SkillExecutionResult

    const executor = async (): Promise<SkillExecutionResult> => {
      switch (config.executionType) {
        case 'http':
          return executeHttp(config, params)
        case 'mcp':
          return executeMcp(config, params)
        case 'code':
          return executeCode(config, params)
        case 'proxy':
          return executeProxy(config, params)
        case 'builtin':
        default:
          return executeBuiltin(config, params)
      }
    }

    // 带重试的执行
    result = await executeWithRetry(executor, config.retryPolicy)
    result.durationMs = Date.now() - startTime

    // 记录日志
    if (!options.skipLog) {
      await logExecution(
        skillId,
        'success',
        params,
        result.data,
        null,
        result.durationMs,
        options.agentId,
        options.sessionId
      )
    }

    return result
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = (error as Error).message

    // 记录失败日志
    if (!options.skipLog) {
      await logExecution(
        skillId,
        'error',
        params,
        null,
        errorMessage,
        durationMs,
        options.agentId,
        options.sessionId
      )
    }

    return {
      success: false,
      error: errorMessage,
      durationMs,
    }
  }
}

// 导入库存报告生成器
import { generateInventoryReport } from '../routes/inventory'

// 注册库存检查内置处理器
registerBuiltinHandler('inventory-check', async (params: any) => {
  const report = generateInventoryReport()
  
  // 生成简化的检查摘要
  const summary = {
    totalProducts: report.summary.totalProducts,
    criticalCount: report.summary.criticalCount,
    lowCount: report.summary.lowCount,
    normalCount: report.summary.normalCount,
    urgentItems: report.critical.map((item: any) => ({
      name: item.name,
      sku: item.sku,
      currentStock: item.currentStock,
      suggestedReorder: item.suggestedReorder,
      estimatedDaysRemaining: item.estimatedDaysRemaining
    })),
    lowItems: report.low.map((item: any) => ({
      name: item.name,
      sku: item.sku,
      currentStock: item.currentStock,
      suggestedReorder: item.suggestedReorder,
      estimatedDaysRemaining: item.estimatedDaysRemaining
    })),
    totalReorderCost: report.summary.estimatedReorderCost,
    recommendations: report.recommendations
  }
  
  return {
    success: true,
    summary,
    fullReport: report,
    message: `库存检查完成：发现 ${report.summary.criticalCount} 个库存告急商品，${report.summary.lowCount} 个库存不足商品，建议补货总成本 ¥${report.summary.estimatedReorderCost.toLocaleString()}`
  }
})

// 注册社交发布内置处理器
registerBuiltinHandler('social-post', async (params: any) => {
  const { platform, topic, style, needImage, needVideo } = params

  const platformConfigs: Record<string, { name: string; maxChars: number }> = {
    weibo: { name: '微博', maxChars: 2000 },
    xiaohongshu: { name: '小红书', maxChars: 1000 },
    douyin: { name: '抖音', maxChars: 500 },
    wechat: { name: '微信公众号', maxChars: 10000 },
    twitter: { name: 'Twitter/X', maxChars: 280 },
    x: { name: 'X', maxChars: 280 },
    linkedin: { name: 'LinkedIn', maxChars: 3000 },
  }

  const config = platformConfigs[platform] || { name: platform, maxChars: 1000 }

  // 生成内容（简化版）
  return {
    platform: config.name,
    title: `${topic} - ${style || '专业'}分享`,
    body: `关于${topic}的内容创作...`,
    tags: [`#${topic}`],
    images: needImage ? [`https://placehold.co/800x600/22c55e/ffffff?text=${encodeURIComponent(platform)}`] : [],
    videos: needVideo ? [`https://placehold.co/800x600/3b82f6/ffffff?text=video`] : [],
    estimatedReach: Math.floor(Math.random() * 10000) + 1000,
  }
})

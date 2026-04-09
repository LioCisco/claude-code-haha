import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { ToolUseContext } from '../Tool.js'
import type { Command } from '../types/command.js'
import { logError } from '../utils/log.js'
import { toError } from '../utils/errors.js'
import { logForDebugging } from '../utils/debug.js'

// Web-UI 服务配置
const WEB_UI_URL = process.env.WEB_UI_URL || 'http://localhost:8080'

// 缓存
let webUISkillsCache: Command[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30 * 1000 // 30 秒缓存

export interface WebUISkillDefinition {
  id: string
  name: string
  description: string
  icon?: string
  category: string
  status: 'active' | 'inactive' | 'beta'
  isBuiltIn: boolean
  executionType: 'builtin' | 'http' | 'mcp' | 'code' | 'proxy'
  executionConfig?: Record<string, unknown>
  configSchema?: Record<string, unknown>
  authType: 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer'
  authConfig?: Record<string, unknown>
  timeoutMs: number
  retryPolicy?: {
    maxRetries: number
    backoffType: 'fixed' | 'exponential'
    initialDelay: number
  }
  rateLimitPerMinute: number
  documentationUrl?: string
  examples?: Record<string, unknown>[]
  createdAt?: string
  updatedAt?: string
}

/**
 * 从 Web-UI API 获取技能列表
 */
async function fetchWebUISkills(): Promise<WebUISkillDefinition[]> {
  try {
    const response = await fetch(`${WEB_UI_URL}/api/skills`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success || !data.skills) {
      return []
    }

    // 只返回激活的技能
    return data.skills.filter((s: WebUISkillDefinition) => s.status === 'active')
  } catch (error) {
    logForDebugging(`Failed to fetch Web-UI skills: ${error}`)
    return []
  }
}

/**
 * 执行 Web-UI 技能
 */
async function executeWebUISkill(
  skillId: string,
  args: string,
  context: ToolUseContext,
): Promise<ContentBlockParam[]> {
  const sessionId = context.getAppState().sessionId

  try {
    const response = await fetch(`${WEB_UI_URL}/api/skills/${skillId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        params: parseArgs(args),
        sessionId,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      return [
        {
          type: 'text',
          text: `执行失败: ${data.message || '未知错误'}`,
        },
      ]
    }

    // 格式化结果
    const resultText = typeof data.result === 'string'
      ? data.result
      : JSON.stringify(data.result, null, 2)

    return [
      {
        type: 'text',
        text: `## Web-UI 技能执行结果\n\n技能: ${skillId}\n耗时: ${data.durationMs || 0}ms\n\n${resultText}`,
      },
    ]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return [
      {
        type: 'text',
        text: `执行 Web-UI 技能失败: ${errorMessage}`,
      },
    ]
  }
}

/**
 * 解析参数字符串为对象
 */
function parseArgs(args: string): Record<string, unknown> {
  if (!args.trim()) return {}

  const params: Record<string, unknown> = {}

  // 尝试解析为 JSON
  try {
    const json = JSON.parse(args)
    if (typeof json === 'object' && json !== null) {
      return json
    }
  } catch {
    // 不是 JSON，继续解析键值对
  }

  // 解析 key=value 格式
  const pairs = args.match(/(\w+)=("[^"]*"|[^\s]*)/g)
  if (pairs) {
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=')
      let value = valueParts.join('=')

      // 去除引号
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1)
      }

      // 尝试转换为数字或布尔值
      if (value === 'true') {
        params[key] = true
      } else if (value === 'false') {
        params[key] = false
      } else if (/^\d+$/.test(value)) {
        params[key] = parseInt(value, 10)
      } else if (/^\d+\.\d+$/.test(value)) {
        params[key] = parseFloat(value)
      } else {
        params[key] = value
      }
    }
  } else {
    // 没有键值对，将整个字符串作为 content 参数
    params.content = args.trim()
  }

  return params
}

/**
 * 将 Web-UI 技能定义转换为 Claude Code Command
 */
function convertToCommand(skill: WebUISkillDefinition): Command {
  return {
    type: 'prompt',
    name: skill.id,
    description: skill.description,
    hasUserSpecifiedDescription: true,
    aliases: [],
    allowedTools: [],
    argumentHint: skill.configSchema
      ? Object.keys(skill.configSchema.properties || {}).join(', ')
      : undefined,
    whenToUse: skill.documentationUrl
      ? `查看文档: ${skill.documentationUrl}`
      : `Web-UI ${skill.category} 技能`,
    contentLength: 0,
    source: 'webui',
    loadedFrom: 'webui',
    isEnabled: () => skill.status === 'active',
    isHidden: false,
    progressMessage: `执行 ${skill.name}...`,
    disableModelInvocation: false,
    userInvocable: true,
    async getPromptForCommand(args: string, context: ToolUseContext): Promise<ContentBlockParam[]> {
      return executeWebUISkill(skill.id, args, context)
    },
  }
}

/**
 * 获取所有 Web-UI 技能作为 Commands
 */
export async function getWebUISkillCommands(): Promise<Command[]> {
  const now = Date.now()

  if (webUISkillsCache && now - cacheTimestamp < CACHE_TTL) {
    return webUISkillsCache
  }

  const skills = await fetchWebUISkills()
  const commands = skills.map(convertToCommand)

  webUISkillsCache = commands
  cacheTimestamp = now

  logForDebugging(`Loaded ${commands.length} Web-UI skills`)
  return commands
}

/**
 * 清除缓存（用于强制刷新）
 */
export function clearWebUISkillsCache(): void {
  webUISkillsCache = null
  cacheTimestamp = 0
}

/**
 * 检查 Web-UI 是否可用
 */
export async function isWebUIAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${WEB_UI_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

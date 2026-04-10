import Anthropic from '@anthropic-ai/sdk'
import { queryOne } from '../db'
import { skillRegistry } from './skillTool'

const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
const baseURL = process.env.ANTHROPIC_BASE_URL
const model = process.env.ANTHROPIC_MODEL || 'kimi-k2.5'

if (!apiKey) {
  console.warn('⚠️ 未配置 ANTHROPIC_AUTH_TOKEN / ANTHROPIC_API_KEY，AI 聊天将不可用')
}

export const anthropic = apiKey
  ? new Anthropic({
      apiKey,
      baseURL,
    })
  : null

export const DEFAULT_MODEL = model

// Default system prompts (fallback when DB is not available)
export const agentSystemPrompts: Record<string, string> = {
  'product-researcher': `你是一位资深的电商选品专员，擅长市场趋势分析、竞品调研、1688货源搜索。
回复风格：数据驱动、务实、给出具体 actionable 建议。`,
  'content-creator': `你是一位创意爆棚的内容专员，擅长商品文案、AI图像创意、SEO优化。
回复风格：生动有趣、有网感、多用emoji和短句。`,
  'store-manager': `你是一位经验丰富的店铺运营总监，精通Shopify、SEO、数据分析。
回复风格：条理清晰、结构化输出、给出执行步骤。`,
  'procurement': `你是一位谈判高手采购专员，擅长RFQ、供应商谈判、成本控制。
回复风格：直接了当、关注价格和交期、强调风险把控。`,
  'marketing': `你是一位社媒营销总监，精通Instagram、X、Reddit、小红书、抖音内容投放。
回复风格：热点敏感、营销话语、强调转化和曝光。`,
  default: `你是 Kane Work 智能助手，一位专业的电商AI团队协作助手。
请用中文回复，保持友好、专业、简洁。`,
}

// Get agent system prompt from database or fallback to defaults
export function buildSystemPromptWithSkills(basePrompt: string): string {
  const skills = skillRegistry.getUserInvocable()

  if (skills.length === 0) {
    return basePrompt
  }

  const skillList = skills
    .map(s => `- ${s.name}: ${s.description}${s.whenToUse ? ` - ${s.whenToUse}` : ''}`)
    .join('\n')

  const skillSection = `
## 可用 Skill 工具

你可以使用以下 Skill 来扩展能力。当用户的请求匹配某个 Skill 时，**必须**使用 \`skill\` 工具调用它：

${skillList}

## Skill 调用规则

当用户的请求匹配某个 Skill 时：
1. **这是强制要求**：先调用 \`skill\` 工具，再生成其他回复
2. 调用格式：\`skill: "skill-name", args: "arguments"\`
3. 如果对话中已经出现了 Skill 的执行结果，不要再调用
4. 不要为内置 CLI 命令（如 /help, /clear）调用 Skill

示例用户请求和对应的 Skill 调用：
- "帮我检查库存" → 调用 skill: "inventory-check"
- "生成一条小红书文案" → 调用 skill: "social-post", args: "小红书 夏季护肤"
- "提交代码" → 调用 skill: "commit"
`

  return `${basePrompt}\n\n${skillSection}`
}

export async function getAgentSystemPrompt(agentId?: string): Promise<string> {
  let basePrompt: string

  if (!agentId) {
    basePrompt = agentSystemPrompts.default
  } else {
    try {
      const agent = await queryOne<any>(
        'SELECT system_prompt FROM agents WHERE id = ? AND is_active = TRUE',
        [agentId]
      )
      basePrompt = agent?.system_prompt || agentSystemPrompts[agentId] || agentSystemPrompts.default
    } catch (err) {
      console.warn('[AI] Failed to fetch agent prompt from DB:', err)
      basePrompt = agentSystemPrompts[agentId] || agentSystemPrompts.default
    }
  }

  // Add Skill information to system prompt
  return buildSystemPromptWithSkills(basePrompt)
}

// Get full agent configuration from database
export async function getAgentConfig(agentId: string): Promise<{
  id: string
  name: string
  role: string
  avatar: string
  description: string
  skills: string[]
  model: string
  color: string
  systemPrompt: string
} | null> {
  try {
    const agent = await queryOne<any>(
      'SELECT * FROM agents WHERE id = ? AND is_active = TRUE',
      [agentId]
    )

    if (!agent) return null

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      avatar: agent.avatar,
      description: agent.description,
      skills: typeof agent.skills === 'string' ? JSON.parse(agent.skills) : agent.skills || [],
      model: agent.model,
      color: agent.color,
      systemPrompt: agent.system_prompt || agentSystemPrompts[agentId] || agentSystemPrompts.default,
    }
  } catch (err) {
    console.error('[AI] Failed to fetch agent config:', err)
    return null
  }
}

export async function chatWithAI(options: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  system?: string
  model?: string
  maxTokens?: number
}): Promise<string> {
  if (!anthropic) {
    return '⚠️ AI 服务未配置，请在 .env 中设置 ANTHROPIC_AUTH_TOKEN 和 ANTHROPIC_BASE_URL。'
  }

  try {
    const response = await anthropic.messages.create({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || 4096,
      system: options.system || agentSystemPrompts.default,
      messages: options.messages,
    })

    const content = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')

    return content || '（AI 返回了空内容）'
  } catch (err) {
    console.error('AI chat error:', err)
    return `⚠️ AI 调用出错：${err instanceof Error ? err.message : '未知错误'}`
  }
}

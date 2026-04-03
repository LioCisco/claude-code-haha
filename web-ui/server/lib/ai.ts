import Anthropic from '@anthropic-ai/sdk'

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

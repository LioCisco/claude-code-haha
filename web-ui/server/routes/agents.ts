import { Elysia, t } from 'elysia'

const agents = [
  {
    id: 'product-researcher',
    name: '选品专员',
    role: '爆款选品总监',
    avatar: '🔍',
    description: '擅长市场趋势分析、竞品调研、1688以图搜货',
    skills: ['market-research', 'product-sourcing', 'trend-analysis'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#22c55e',
  },
  {
    id: 'content-creator',
    name: '内容专员',
    role: '内容生成专员',
    avatar: '✍️',
    description: '自动生成商品描述、AI模特图、营销文案',
    skills: ['copywriting', 'image-generation', 'seo-optimization'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#f97316',
  },
  {
    id: 'store-manager',
    name: '运营专员',
    role: '店铺运营总监',
    avatar: '🏪',
    description: 'Shopify店铺搭建、SEO优化、数据分析',
    skills: ['shopify', 'seo', 'analytics', 'listing-optimization'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#3b82f6',
  },
  {
    id: 'procurement',
    name: '采购专员',
    role: '采购谈判专员',
    avatar: '🤝',
    description: '自动发起RFQ、供应商谈判、订单跟进',
    skills: ['rfq', 'negotiation', 'supplier-management'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#8b5cf6',
  },
  {
    id: 'marketing',
    name: '营销专员',
    role: '社媒营销总监',
    avatar: '📢',
    description: 'Instagram/X/Reddit内容发布、广告投放',
    skills: ['social-media', 'ads', 'content-marketing'],
    status: 'idle',
    model: 'claude-sonnet-4-6',
    color: '#ec4899',
  },
]

export const agentRoutes = new Elysia({ prefix: '/api/agents' })
  .get('/', () => agents)
  .get('/:id', ({ params }) => {
    const agent = agents.find(a => a.id === params.id)
    if (!agent) throw new Error('Agent not found')
    return agent
  })

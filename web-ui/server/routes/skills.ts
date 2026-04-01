import { Elysia, t } from 'elysia'

const skills = [
  {
    id: '1688-search',
    name: '1688 智能搜货',
    description: '基于图片或文字描述在1688平台搜索优质货源',
    icon: 'ShoppingCart',
    category: 'procurement',
    status: 'active',
    usage: 1234,
  },
  {
    id: 'product-description',
    name: '商品描述生成',
    description: '自动生成吸引人的商品标题和描述',
    icon: 'FileText',
    category: 'content',
    status: 'active',
    usage: 892,
  },
  {
    id: 'ai-model-image',
    name: 'AI 模特生成',
    description: '自动生成专业的产品展示图',
    icon: 'Image',
    category: 'content',
    status: 'active',
    usage: 567,
  },
  {
    id: 'shopify-builder',
    name: 'Shopify 店铺搭建',
    description: '自动创建和配置Shopify店铺',
    icon: 'Globe',
    category: 'store',
    status: 'active',
    usage: 234,
  },
  {
    id: 'seo-optimizer',
    name: 'SEO 优化器',
    description: '自动优化商品关键词和搜索排名',
    icon: 'TrendingUp',
    category: 'store',
    status: 'active',
    usage: 445,
  },
]

export const skillRoutes = new Elysia({ prefix: '/api/skills' })
  .get('/', () => skills)
  .get('/:id', ({ params }) => {
    const skill = skills.find(s => s.id === params.id)
    if (!skill) throw new Error('Skill not found')
    return skill
  })
  .post('/:id/execute', ({ params, body }) => {
    return {
      success: true,
      message: `Skill ${params.id} executed`,
      result: { /* execution result */ }
    }
  }, {
    body: t.Object({
      params: t.Record(t.String(), t.Any())
    })
  })

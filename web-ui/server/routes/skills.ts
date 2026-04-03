import { Elysia, t } from 'elysia'

const platformConfigs: Record<string, { name: string; maxChars: number; features: string[] }> = {
  weibo: { name: '微博', maxChars: 2000, features: ['话题标签', '图片', '视频'] },
  xiaohongshu: { name: '小红书', maxChars: 1000, features: ['标题', '正文', '话题标签', 'emoji', '图片'] },
  douyin: { name: '抖音', maxChars: 500, features: ['标题', '话题标签', '视频'] },
  wechat: { name: '微信公众号', maxChars: 10000, features: ['长文', '图片', '视频', '排版'] },
  twitter: { name: 'Twitter/X', maxChars: 280, features: ['话题标签', '图片', '视频'] },
  x: { name: 'X', maxChars: 280, features: ['话题标签', '图片', '视频'] },
  linkedin: { name: 'LinkedIn', maxChars: 3000, features: ['专业内容', '图片', '视频'] },
}

function generateSocialContent(platform: string, topic: string, style?: string, needImage = false, needVideo = false) {
  const config = platformConfigs[platform] || { name: platform, maxChars: 1000, features: ['文本', '图片'] }
  const styleText = style || '专业'

  const titles: Record<string, string[]> = {
    xiaohongshu: [`🔥${topic}｜一篇说清楚！`, `${topic}✨干货分享`, `关于${topic}，我的真实体验💡`],
    weibo: [`【热点】${topic}`, `${topic}，你怎么看？`, `#${topic}# 最新消息`],
    douyin: [`${topic}？3秒告诉你答案`, `原来${topic}这么简单`, `99%的人不知道的${topic}技巧`],
    wechat: [`深度解析：${topic}`, `${topic}完全指南`, `做好${topic}的10个关键`],
    twitter: [`Quick take on ${topic}:`, `Thread about ${topic} 🧵`, `${topic} in a nutshell.`],
    x: [`Quick take on ${topic}:`, `Thread about ${topic} 🧵`, `${topic} in a nutshell.`],
    linkedin: [`Insights on ${topic}`, `How to master ${topic}`, `${topic}: A professional perspective.`],
  }

  const title = titles[platform]?.[Math.floor(Math.random() * (titles[platform]?.length || 1))] || `${topic} - ${styleText}分享`

  const bodies: Record<string, string> = {
    xiaohongshu: `姐妹们，今天来聊聊${topic}～\n\n首先，我觉得最重要的是找准方向\n然后持续输出有价值的内容\n最后别忘了和粉丝互动\n\n希望这篇对你有帮助！`,
    weibo: `最近很多人在问${topic}，我整理了一些观点，分享给大家。\n\n核心就是：专注+坚持+方法。\n\n大家有什么想法欢迎评论区交流！`,
    douyin: `${topic}其实没那么复杂，记住这三点就够了！`,
    wechat: `大家好，今天我们来深入探讨一下${topic}。\n\n一、行业现状分析\n二、关键成功要素\n三、实操建议\n四、未来趋势\n\n总结：${topic}是一个值得长期投入的赛道。`,
    twitter: `Here are 3 quick tips on ${topic}:\n1. Stay consistent\n2. Provide value\n3. Engage with your audience`,
    x: `Here are 3 quick tips on ${topic}:\n1. Stay consistent\n2. Provide value\n3. Engage with your audience`,
    linkedin: `In my experience, ${topic} requires both strategy and execution. Here is what I have learned over the years.\n\nWould love to hear your thoughts.`,
  }

  const body = bodies[platform] || `关于${topic}的${styleText}内容分享。`

  const tagsMap: Record<string, string[]> = {
    xiaohongshu: [`#${topic}`, '#干货分享', '#自媒体运营', '#内容创作'],
    weibo: [`#${topic}#`, '#热门推荐', '#观点分享'],
    douyin: [`#${topic}`, '#短视频运营', '#上热门'],
    wechat: [],
    twitter: [`#${topic.replace(/\s+/g, '')}`, '#ContentCreator', '#SocialMedia'],
    x: [`#${topic.replace(/\s+/g, '')}`, '#ContentCreator', '#SocialMedia'],
    linkedin: [`#${topic.replace(/\s+/g, '')}`, '#Leadership', '#Innovation'],
  }

  const tags = tagsMap[platform] || []

  return {
    platform: config.name,
    title,
    body,
    tags,
    style: styleText,
    images: needImage ? [`https://placehold.co/800x600/22c55e/ffffff?text=${encodeURIComponent(platform)}+配图`] : [],
    videos: needVideo ? [`https://placehold.co/800x600/3b82f6/ffffff?text=${encodeURIComponent(platform)}+短视频`] : [],
    estimatedReach: Math.floor(Math.random() * 10000) + 1000,
  }
}

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
  {
    id: 'social-post',
    name: '社媒内容发布',
    description: '自动生成并发布小红书、微博、抖音、公众号、Twitter等平台内容',
    icon: 'MessageSquare',
    category: 'marketing',
    status: 'active',
    usage: 678,
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
    if (params.id === 'social-post') {
      const { platform, topic, style, needImage, needVideo } = body.params as {
        platform: string
        topic: string
        style?: string
        needImage?: boolean
        needVideo?: boolean
      }
      if (!platform || !topic) {
        return {
          success: false,
          message: '缺少必要参数：platform 和 topic',
          result: null,
        }
      }
      const content = generateSocialContent(platform, topic, style, needImage, needVideo)
      return {
        success: true,
        message: `已成功为 ${content.platform} 生成社媒内容`,
        result: content,
      }
    }

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

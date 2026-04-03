import { registerBundledSkill } from '../bundledSkills.js'
import { AGENT_TOOL_NAME } from '../../tools/AgentTool/constants.js'

const USAGE_MESSAGE = `Usage: /social <平台> <主题/内容描述> [选项]

一键生成社交媒体文案、图片、视频并自动发布。

支持的平台:
  - weibo: 微博
  - xiaohongshu: 小红书
  - douyin: 抖音
  - wechat: 微信公众号
  - twitter/x: X/Twitter
  - linkedin: LinkedIn

选项:
  --style <风格>: 内容风格 (专业/幽默/文艺/促销/故事)
  --image: 生成配图
  --video: 生成视频
  --confirm: 跳过确认直接发布（谨慎使用）

示例:
  /social 小红书 夏季护肤技巧 --style 专业 --image
  /social weibo 新品发布会预告 --style 促销 --image --video
  /social xiaohongshu 周末探店日记 --style 故事

工作流程:
  1. 分析平台特点和受众
  2. 生成文案（标题+正文+话题标签）
  3. 如需图片：生成配图
  4. 如需视频：生成短视频
  5. 展示预览，等待确认
  6. 确认后自动发布`

interface SocialMediaArgs {
  platform: string
  topic: string
  style?: string
  needImage: boolean
  needVideo: boolean
  autoConfirm: boolean
}

function parseArgs(args: string): SocialMediaArgs | null {
  const parts = args.trim().split(/\s+/)
  if (parts.length < 2) return null

  const platform = parts[0]!.toLowerCase()
  const options = {
    platform,
    topic: '',
    style: undefined as string | undefined,
    needImage: false,
    needVideo: false,
    autoConfirm: false,
  }

  // Parse options
  const remainingParts: string[] = []
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]!
    if (part === '--image') {
      options.needImage = true
    } else if (part === '--video') {
      options.needVideo = true
    } else if (part === '--confirm') {
      options.autoConfirm = true
    } else if (part === '--style' && i + 1 < parts.length) {
      options.style = parts[++i]
    } else if (!part.startsWith('--')) {
      remainingParts.push(part)
    }
  }

  options.topic = remainingParts.join(' ')
  if (!options.topic) return null

  return options
}

function getPlatformConfig(platform: string): {
  name: string
  maxChars: number
  features: string[]
} {
  const configs: Record<string, { name: string; maxChars: number; features: string[] }> = {
    weibo: { name: '微博', maxChars: 2000, features: ['话题标签', '图片', '视频'] },
    xiaohongshu: { name: '小红书', maxChars: 1000, features: ['标题', '正文', '话题标签', 'emoji', '图片'] },
    douyin: { name: '抖音', maxChars: 500, features: ['标题', '话题标签', '视频'] },
    wechat: { name: '微信公众号', maxChars: 10000, features: ['长文', '图片', '视频', '排版'] },
    twitter: { name: 'Twitter/X', maxChars: 280, features: ['话题标签', '图片', '视频'] },
    x: { name: 'X', maxChars: 280, features: ['话题标签', '图片', '视频'] },
    linkedin: { name: 'LinkedIn', maxChars: 3000, features: ['专业内容', '图片', '视频'] },
  }

  return configs[platform] || { name: platform, maxChars: 1000, features: ['文本', '图片'] }
}

function buildPrompt(args: SocialMediaArgs): string {
  const config = getPlatformConfig(args.platform)
  const styleText = args.style ? `，风格要求：${args.style}` : ''

  let prompt = `# 社交媒体内容生成与发布

## 任务
为 ${config.name} 平台生成社交媒体内容${styleText}。

## 平台特点
- 平台名称: ${config.name}
- 字数限制: ${config.maxChars} 字符
- 支持功能: ${config.features.join(', ')}

## 用户需求
主题/内容: ${args.topic}
${args.needImage ? '- 需要生成配图\n' : ''}${args.needVideo ? '- 需要生成视频\n' : ''}${args.autoConfirm ? '- 自动确认发布\n' : '- 需要用户确认后发布'}

## 执行步骤

### 步骤 1: 内容策划
分析以下内容要素：
1. 目标受众分析
2. 内容角度/切入点
3. 关键信息点
4. 情感调性
5. 行动号召

### 步骤 2: 文案生成
根据平台特点生成：

**小红书格式示例：**
- 标题：15-20字，带emoji，吸引眼球
- 正文：分段清晰，每段2-3行，多用emoji
- 结尾：3-5个相关话题标签
- 整体：真实分享感，避免硬广

**微博格式示例：**
- 开头：钩子或热点引入
- 正文：简洁有力，适合快速阅读
- 话题：2-3个相关话题标签
- 互动：引导评论/转发

**Twitter/X格式示例：**
- 简洁直接，单条推文控制在280字符内
- 如需长内容用线程(thread)形式
- 2-3个话题标签

**抖音格式示例：**
- 标题：悬念/提问/数字形式
- 简短有力，配合视频内容
- 话题标签增加曝光

### 步骤 3: ${args.needImage ? '图片生成' : '跳过'}
${args.needImage ? `使用图像生成工具创建配图：
- 风格：符合平台调性和内容主题
- 尺寸：根据平台选择 (小红书/Instagram: 3:4, 微博/Twitter: 16:9 或 1:1)
- 元素：包含关键视觉信息，避免纯文字
- 质量：高清，色彩协调` : ''}

### 步骤 4: ${args.needVideo ? '视频生成' : '跳过'}
${args.needVideo ? `使用视频生成工具创建短视频：
- 时长：15-60秒（根据平台优化）
- 内容：配合文案，有开头钩子+中间内容+结尾引导
- 风格：符合平台流行趋势
- 字幕：添加关键字幕` : ''}

### 步骤 5: 预览与确认
生成完整预览：
1. 展示文案内容
2. ${args.needImage ? '展示生成的图片' : ''}
3. ${args.needVideo ? '展示生成的视频信息' : ''}
4. 说明发布时间和账号
${args.autoConfirm ? '' : '\n**等待用户确认后再执行发布**'}

### 步骤 6: 发布执行
${args.autoConfirm ? '直接执行发布操作' : '用户确认后，调用相关API或工具执行发布'}

## 输出格式
请按以下结构输出：

---
### 📋 内容策划
[受众、角度、信息点分析]

### ✍️ 生成文案
**标题：** [标题内容]

**正文：**
[正文内容]

**话题标签：** [标签列表]

### 🖼️ ${args.needImage ? '配图方案' : ''}
${args.needImage ? '[图片描述或生成的图片]' : ''}

### 🎬 ${args.needVideo ? '视频方案' : ''}
${args.needVideo ? '[视频脚本/描述]' : ''}

### 👁️ 发布预览
[完整预览]

### ✅ 发布状态
${args.autoConfirm ? '已自动发布' : '等待用户确认...'}
---

## 注意事项
1. 内容必须符合平台社区规范
2. 避免敏感话题和违规内容
3. 图片/视频不得侵犯版权
4. 尊重用户隐私
5. 发布前再次检查内容准确性

现在请开始执行。`

  return prompt
}

export function registerSocialMediaSkill(): void {
  registerBundledSkill({
    name: 'social',
    description: '一键生成社交媒体文案、图片、视频并自动发布 (支持小红书/微博/抖音/公众号/Twitter等)',
    whenToUse:
      '当用户需要创建和发布社交媒体内容时使用。支持生成文案、配图、视频，并在确认后自动发布到小红书、微博、抖音、微信公众号、Twitter/X、LinkedIn等平台。',
    argumentHint: '<平台> <主题> [--style <风格>] [--image] [--video] [--confirm]',
    userInvocable: true,
    async getPromptForCommand(args) {
      const trimmed = args.trim()
      if (!trimmed || trimmed === '--help' || trimmed === '-h') {
        return [{ type: 'text', text: USAGE_MESSAGE }]
      }

      const parsed = parseArgs(trimmed)
      if (!parsed) {
        return [{ type: 'text', text: `参数解析错误。\n\n${USAGE_MESSAGE}` }]
      }

      return [{ type: 'text', text: buildPrompt(parsed) }]
    },
  })
}

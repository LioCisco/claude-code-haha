import { skillRegistry, type SkillDefinition } from './skillTool'
import { executeSkill } from './skillExecutor'
import { query } from '../db'

// 库存检查 Skill
const inventoryCheckSkill: SkillDefinition = {
  name: 'inventory-check',
  description: '检查库存状态，识别库存不足和告急的商品，提供补货建议',
  whenToUse: '当用户询问库存状态、需要补货建议、或想了解哪些商品库存不足时使用',
  argumentHint: '[--detailed] [--category <分类>]',
  aliases: ['库存检查', 'stock-check'],
  userInvocable: true,
  source: 'builtin',
  allowedTools: ['bash', 'read_file'],
  async getPrompt(args: string) {
    return `# 库存检查任务

请执行库存检查分析，${args ? `参数: ${args}` : '提供标准摘要'}。

你需要：
1. 分析当前库存状态
2. 识别库存告急（< 3天）和库存不足（< 7天）的商品
3. 计算建议补货数量
4. 估算补货成本

请使用工具或 API 获取库存数据并生成报告。`
  },
}

// 社媒发布 Skill
const socialPostSkill: SkillDefinition = {
  name: 'social-post',
  description: '为指定平台生成社媒内容，包括文案、标签、配图建议',
  whenToUse: '当用户需要发布社交媒体内容、生成营销文案、或需要平台特定的内容格式时使用',
  argumentHint: '<平台> <主题> [--style <风格>] [--image] [--video]',
  aliases: ['social', '社媒发布'],
  userInvocable: true,
  source: 'builtin',
  async getPrompt(args: string) {
    // 解析参数
    const parts = args.split(' ').filter(Boolean)
    const platform = parts[0] || '小红书'
    const topic = parts.slice(1).join(' ').replace(/--\w+/g, '').trim() || '产品推荐'
    const style = args.match(/--style\s+(\S+)/)?.[1] || '专业'
    const needImage = args.includes('--image')
    const needVideo = args.includes('--video')

    return `# 社媒内容创作任务

**平台**: ${platform}
**主题**: ${topic}
**风格**: ${style}
${needImage ? '**需要配图**: 是\n' : ''}${needVideo ? '**需要视频**: 是\n' : ''}

请为 ${platform} 平台创作关于 "${topic}" 的内容：

1. 标题（吸引人、符合平台调性）
2. 正文内容（${style}风格）
3. 相关标签（3-5个）
4. ${needImage ? '配图建议（尺寸、风格、内容描述）' : ''}
5. 预估互动率

平台特点：
- 小红书：生活化、真实体验、emoji、短段落
- 微博：热点结合、话题标签、@提及
- 抖音：简短有力、口语化、引导互动
- 微信公众号：深度内容、结构化、专业性强

请直接生成内容并展示给用户。`
  },
}

// 简化代码 Skill（类似 Claude Code 的 simplify）
const simplifySkill: SkillDefinition = {
  name: 'simplify',
  description: 'Review changed code for reuse, quality, and efficiency, then fix any issues found',
  whenToUse: 'Use when the user wants to review code changes, refactor code, or improve code quality. Trigger phrases: "simplify", "review code", "refactor", "clean up"',
  argumentHint: '[文件路径或描述]',
  userInvocable: true,
  source: 'builtin',
  allowedTools: ['bash', 'read_file', 'write_file', 'edit_file', 'glob', 'grep'],
  async getPrompt(args: string) {
    return `# Simplify: Code Review and Cleanup

Review ${args || 'changed files'} for reuse, quality, and efficiency. Fix any issues found.

## Phase 1: Identify Changes

Run \`git diff\` or \`git diff HEAD\` to see what changed. If there are no git changes, review the files mentioned by the user.

## Phase 2: Launch Three Review Agents in Parallel

### Agent 1: Code Reuse Review
- Search for existing utilities that could replace newly written code
- Flag any new function that duplicates existing functionality
- Flag inline logic that could use existing utilities

### Agent 2: Code Quality Review
- Redundant state and unnecessary complexity
- Parameter sprawl and copy-paste patterns
- Leaky abstractions and stringly-typed code
- Unnecessary comments

### Agent 3: Efficiency Review
- Unnecessary work and missed concurrency
- Hot-path bloat and memory issues
- Overly broad operations

## Phase 3: Fix Issues

Wait for all findings and fix each issue directly. Briefly summarize what was fixed.`
  },
}

// 提交代码 Skill
const commitSkill: SkillDefinition = {
  name: 'commit',
  description: '生成提交信息并执行 git commit',
  whenToUse: '当用户想要提交代码、保存更改、或创建 git 提交时使用',
  argumentHint: '[描述] [--amend]',
  aliases: ['git-commit'],
  userInvocable: true,
  source: 'builtin',
  allowedTools: ['bash', 'read_file'],
  async getPrompt(args: string) {
    return `# Git Commit 任务

${args ? `用户描述: ${args}` : ''}

请执行以下步骤：

1. 运行 \`git status\` 查看更改状态
2. 运行 \`git diff --cached\` 或 \`git diff\` 查看具体更改内容
3. 根据更改类型生成合适的提交信息（遵循 Conventional Commits 规范）
   - feat: 新功能
   - fix: 修复
   - docs: 文档
   - style: 格式
   - refactor: 重构
   - test: 测试
   - chore: 构建/工具
4. 执行 \`git add\` 和 \`git commit\`

提交信息格式：
<type>(<scope>): <subject>

<body>

<footer>`
  },
}

// 注册所有内置 Skill
export function registerBuiltinSkills(): void {
  skillRegistry.register(inventoryCheckSkill)
  skillRegistry.register(socialPostSkill)
  skillRegistry.register(simplifySkill)
  skillRegistry.register(commitSkill)

  console.log('[BuiltinSkills] Registered skills:',
    skillRegistry.getUserInvocable().map(s => s.name).join(', '))
}

export async function loadSkillsFromDatabase(): Promise<void> {
  try {
    const rows = await query(`
      SELECT id, name, description, category, status,
             execution_type, execution_config, config_schema
      FROM skills WHERE status = 'active'
    `) as any[]

    for (const row of rows) {
      const skill: SkillDefinition = {
        name: row.name || row.id,
        description: row.description || `Skill: ${row.name}`,
        whenToUse: row.config_schema?.whenToUse || row.execution_config?.whenToUse,
        argumentHint: row.config_schema?.argumentHint,
        userInvocable: true,
        source: row.execution_type === 'builtin' ? 'builtin' : 'database',
        async getPrompt(args: string) {
          // 对于数据库中的 skill，调用 skillExecutor 执行
          const result = await executeSkill(row.id, { content: args }, { skipLog: true })
          if (result.success) {
            return typeof result.data === 'string'
              ? result.data
              : JSON.stringify(result.data, null, 2)
          }
          throw new Error(result.error || 'Skill execution failed')
        },
      }
      skillRegistry.register(skill)
    }

    console.log(`[BuiltinSkills] Loaded ${rows.length} skills from database`)
  } catch (err) {
    console.error('[BuiltinSkills] Failed to load skills from database:', err)
  }
}

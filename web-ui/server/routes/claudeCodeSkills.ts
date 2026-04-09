import { Elysia } from 'elysia'
import { readFile, readdir } from 'fs/promises'
import { join, basename, extname } from 'path'

// Claude Code 源码路径
const CLAUDE_CODE_ROOT = '/Users/ciscomario/Desktop/projects/kane/claude-code-haha'
const COMMANDS_DIR = join(CLAUDE_CODE_ROOT, 'src/commands')
const BUNDLED_SKILLS_DIR = join(CLAUDE_CODE_ROOT, 'src/skills/bundled')

export interface ClaudeCodeSkill {
  id: string
  name: string
  description: string
  type: 'command' | 'bundled'
  category: string
  aliases?: string[]
  usage: number
  isActive: boolean
  source: string // 文件路径或 bundled 名称
}

// 从 TypeScript 文件中提取导出信息
async function parseSkillFromFile(filePath: string): Promise<ClaudeCodeSkill | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const fileName = basename(filePath, extname(filePath))

    // 尝试提取 name 和 description
    let name = fileName
    let description = ''
    let aliases: string[] = []

    // 匹配 name: 'xxx' 或 name: "xxx"
    const nameMatch = content.match(/name\s*:\s*['"]([^'"]+)['"]/)
    if (nameMatch) name = nameMatch[1]

    // 匹配 description: 'xxx' 或 description: "xxx" 或 description: `xxx`
    const descMatch = content.match(/description\s*:\s*['"`]([^'"`]+)['"`]/)
    if (descMatch) description = descMatch[1]

    // 匹配 aliases: ['xxx', 'yyy']
    const aliasesMatch = content.match(/aliases\s*:\s*\[([^\]]+)\]/)
    if (aliasesMatch) {
      aliases = aliasesMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
    }

    // 如果没有找到描述，尝试从注释中提取
    if (!description) {
      const commentMatch = content.match(/\/\/\s*(.+)/)
      if (commentMatch) description = commentMatch[1].trim()
    }

    // 根据文件名推断分类
    const category = inferCategory(fileName, content)

    return {
      id: `claude-${fileName}`,
      name,
      description: description || `${name} 命令`,
      type: 'command',
      category,
      aliases: aliases.length > 0 ? aliases : undefined,
      usage: 0, // 暂时为 0
      isActive: true,
      source: filePath.replace(CLAUDE_CODE_ROOT, ''),
    }
  } catch (error) {
    console.error(`解析文件失败: ${filePath}`, error)
    return null
  }
}

// 从 bundled skills 目录解析
async function parseBundledSkills(): Promise<ClaudeCodeSkill[]> {
  const skills: ClaudeCodeSkill[] = []

  try {
    const files = await readdir(BUNDLED_SKILLS_DIR)

    for (const file of files) {
      if (!file.endsWith('.ts')) continue

      const filePath = join(BUNDLED_SKILLS_DIR, file)
      const skill = await parseSkillFromFile(filePath)

      if (skill) {
        skill.type = 'bundled'
        skills.push(skill)
      }
    }
  } catch (error) {
    console.error('读取 bundled skills 失败:', error)
  }

  return skills
}

// 从 commands 目录解析
async function parseCommandSkills(): Promise<ClaudeCodeSkill[]> {
  const skills: ClaudeCodeSkill[] = []
  const processedNames = new Set<string>()

  try {
    const entries = await readdir(COMMANDS_DIR, { withFileTypes: true })

    for (const entry of entries) {
      // 处理单个 .ts 文件
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        const filePath = join(COMMANDS_DIR, entry.name)
        const skill = await parseSkillFromFile(filePath)

        if (skill && !processedNames.has(skill.name)) {
          processedNames.add(skill.name)
          skills.push(skill)
        }
      }
      // 处理目录下的 index.ts
      else if (entry.isDirectory()) {
        const indexPath = join(COMMANDS_DIR, entry.name, 'index.ts')
        try {
          const skill = await parseSkillFromFile(indexPath)
          if (skill && !processedNames.has(skill.name)) {
            processedNames.add(skill.name)
            skills.push(skill)
          }
        } catch {
          // index.ts 可能不存在，忽略
        }
      }
    }
  } catch (error) {
    console.error('读取 commands 失败:', error)
  }

  return skills
}

// 推断技能分类
function inferCategory(fileName: string, content: string): string {
  const name = fileName.toLowerCase()

  // 根据文件名关键字分类
  if (name.includes('git') || name.includes('commit') || name.includes('pr') || name.includes('branch')) {
    return 'git'
  }
  if (name.includes('test') || name.includes('debug') || name.includes('doctor')) {
    return 'debug'
  }
  if (name.includes('config') || name.includes('setting')) {
    return 'config'
  }
  if (name.includes('skill') || name.includes('command')) {
    return 'skill'
  }
  if (name.includes('mcp') || name.includes('plugin')) {
    return 'integration'
  }
  if (name.includes('agent') || name.includes('task')) {
    return 'agent'
  }
  if (content.includes('git') || content.includes('commit')) {
    return 'git'
  }
  if (content.includes('file') || content.includes('edit') || content.includes('read')) {
    return 'file'
  }

  return 'other'
}

// 缓存
let skillsCache: ClaudeCodeSkill[] | null = null
let cacheTime = 0
const CACHE_TTL = 60 * 1000 // 1 分钟缓存

export async function getClaudeCodeSkills(): Promise<ClaudeCodeSkill[]> {
  const now = Date.now()

  if (skillsCache && now - cacheTime < CACHE_TTL) {
    return skillsCache
  }

  const [bundledSkills, commandSkills] = await Promise.all([
    parseBundledSkills(),
    parseCommandSkills(),
  ])

  skillsCache = [...bundledSkills, ...commandSkills]
  cacheTime = now

  return skillsCache
}

// API 路由
export const claudeCodeSkillsRoutes = new Elysia({ prefix: '/api/claude-skills' })
  // 获取所有 Claude Code 技能
  .get('/', async () => {
    const skills = await getClaudeCodeSkills()
    return { success: true, skills }
  })

  // 获取单个技能详情
  .get('/:id', async ({ params, set }) => {
    const skills = await getClaudeCodeSkills()
    const skill = skills.find((s) => s.id === params.id)

    if (!skill) {
      set.status = 404
      return { success: false, message: 'Skill not found' }
    }

    return { success: true, skill }
  })

  // 获取分类列表
  .get('/categories', async () => {
    const skills = await getClaudeCodeSkills()
    const categories = [...new Set(skills.map((s) => s.category))]

    return {
      success: true,
      categories: categories.map((cat) => ({
        id: cat,
        name: getCategoryLabel(cat),
      })),
    }
  })

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    git: 'Git 版本控制',
    debug: '调试与诊断',
    config: '配置管理',
    skill: '技能管理',
    integration: '集成与插件',
    agent: '智能体与任务',
    file: '文件操作',
    other: '其他',
  }
  return labels[category] || category
}

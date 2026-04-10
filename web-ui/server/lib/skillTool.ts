import type Anthropic from '@anthropic-ai/sdk'

export interface SkillDefinition {
  name: string
  description: string
  whenToUse?: string
  argumentHint?: string
  aliases?: string[]
  userInvocable: boolean
  source: 'builtin' | 'database' | 'mcp' | 'plugin'
  getPrompt: (args: string, context: SkillContext) => Promise<string> | string
  allowedTools?: string[]
  context?: 'inline' | 'fork'
}

export interface SkillContext {
  sessionId: string
  userId?: string
  messages: Anthropic.Messages.MessageParam[]
}

export interface SkillRegistry {
  register(skill: SkillDefinition): void
  get(name: string): SkillDefinition | undefined
  getAll(): SkillDefinition[]
  getUserInvocable(): SkillDefinition[]
}

const skills = new Map<string, SkillDefinition>()

export const skillRegistry: SkillRegistry = {
  register(skill: SkillDefinition) {
    skills.set(skill.name, skill)
    // 注册别名
    skill.aliases?.forEach(alias => {
      skills.set(alias, skill)
    })
  },

  get(name: string): SkillDefinition | undefined {
    return skills.get(name)
  },

  getAll(): SkillDefinition[] {
    return Array.from(new Set(skills.values()))
  },

  getUserInvocable(): SkillDefinition[] {
    return this.getAll().filter(s => s.userInvocable)
  },
}

// 清空注册表（用于测试）
export function clearSkillRegistry(): void {
  skills.clear()
}

export const SKILL_TOOL_DEFINITION: Anthropic.Messages.Tool = {
  name: 'skill',
  description: `Execute a skill/slash command within the conversation.

When users ask you to perform tasks, check if any of the available skills match.
When users reference a "slash command" or "/<something>" (e.g., "/commit", "/review"), they are referring to a skill.

How to invoke:
- Use this tool with the skill name and optional arguments
- Examples:
  - skill: "social-post" - invoke the social-post skill
  - skill: "inventory-check", args: "--detailed" - invoke with arguments

Important:
- Available skills are listed in the system prompt
- When a skill matches the user's request, invoke the relevant skill tool BEFORE generating any other response
- NEVER mention a skill without actually calling this tool
- Do not invoke a skill that is already running`,
  input_schema: {
    type: 'object',
    properties: {
      skill: {
        type: 'string',
        description: 'The skill name. E.g., "social-post", "inventory-check", or "commit"',
      },
      args: {
        type: 'string',
        description: 'Optional arguments for the skill',
      },
    },
    required: ['skill'],
  },
}

import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { ToolUseContext } from '../Tool.js'
import type { Command } from '../types/command.js'
import { logForDebugging } from '../utils/debug.js'

// Web-UI 服务配置
const WEB_UI_URL = process.env.WEB_UI_URL || 'http://localhost:8080'

// 缓存
let tasksCache: WebUIScheduledTask[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 10 * 1000 // 10 秒缓存

export interface WebUIScheduledTask {
  id: string
  name: string
  description?: string
  agentId: string
  agentName?: string
  sessionId?: string
  prompt: string
  schedule: {
    type: 'once' | 'daily' | 'interval' | 'cron'
    value: string
  }
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastRun?: string
  nextRun?: string
  totalRuns: number
  successRuns: number
  failRuns: number
}

/**
 * 从 Web-UI API 获取定时任务列表
 */
async function fetchScheduledTasks(): Promise<WebUIScheduledTask[]> {
  try {
    const response = await fetch(`${WEB_UI_URL}/api/scheduled-tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.success || !data.tasks) {
      return []
    }

    return data.tasks
  } catch (error) {
    logForDebugging(`Failed to fetch scheduled tasks: ${error}`)
    return []
  }
}

/**
 * 获取任务统计
 */
async function fetchTaskStats(): Promise<{
  total: number
  enabled: number
  totalRuns: number
  successRuns: number
  failRuns: number
} | null> {
  try {
    const response = await fetch(`${WEB_UI_URL}/api/scheduled-tasks/stats/overview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.success ? data.stats : null
  } catch (error) {
    logForDebugging(`Failed to fetch task stats: ${error}`)
    return null
  }
}

/**
 * 立即执行任务
 */
async function runTaskNow(taskId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${WEB_UI_URL}/api/scheduled-tasks/${taskId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return {
      success: data.success,
      message: data.success ? '任务执行成功' : data.message || '执行失败',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, message: errorMessage }
  }
}

/**
 * 切换任务状态
 */
async function toggleTask(taskId: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${WEB_UI_URL}/api/scheduled-tasks/${taskId}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled }),
    })

    const data = await response.json()
    return {
      success: data.success,
      message: data.success ? `任务已${enabled ? '启用' : '暂停'}` : data.message || '操作失败',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, message: errorMessage }
  }
}

/**
 * 格式化任务列表为文本
 */
function formatTasksList(tasks: WebUIScheduledTask[]): string {
  if (tasks.length === 0) {
    return '暂无定时任务'
  }

  const now = new Date()

  const lines = tasks.map((task) => {
    const status = task.enabled
      ? task.nextRun && new Date(task.nextRun) > now
        ? '🟢 运行中'
        : '⏳ 等待中'
      : '⏸️ 已暂停'

    const scheduleText = formatSchedule(task.schedule)
    const nextRun = task.nextRun
      ? `下次: ${formatDate(new Date(task.nextRun))}`
      : '无计划执行'
    const stats = task.totalRuns > 0
      ? `执行: ${task.successRuns}成功/${task.failRuns}失败`
      : '未执行过'

    return `**${task.name}** \`${task.id}\`
- 智能体: ${task.agentName || task.agentId}
- 状态: ${status}
- 调度: ${scheduleText}
- ${nextRun} | ${stats}${task.description ? '\n- 描述: ' + task.description : ''}`
  })

  return lines.join('\n\n')
}

/**
 * 格式化调度配置
 */
function formatSchedule(schedule: WebUIScheduledTask['schedule']): string {
  switch (schedule.type) {
    case 'once':
      return `单次 ${formatDate(new Date(schedule.value))}`
    case 'daily':
      return `每天 ${schedule.value}`
    case 'interval':
      return `每 ${schedule.value} 分钟`
    case 'cron':
      return `Cron: ${schedule.value}`
    default:
      return `${schedule.type}: ${schedule.value}`
  }
}

/**
 * 格式化日期
 */
function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 清除缓存
 */
export function clearScheduledTasksCache(): void {
  tasksCache = null
  cacheTimestamp = 0
}

/**
 * 获取所有定时任务
 */
export async function getScheduledTasks(): Promise<WebUIScheduledTask[]> {
  const now = Date.now()

  if (tasksCache && now - cacheTimestamp < CACHE_TTL) {
    return tasksCache
  }

  const tasks = await fetchScheduledTasks()
  tasksCache = tasks
  cacheTimestamp = now

  return tasks
}

/**
 * 生成定时任务管理 Commands
 */
export async function getScheduledTaskCommands(): Promise<Command[]> {
  const commands: Command[] = [
    {
      type: 'prompt',
      name: 'scheduled-tasks',
      description: '查看和管理 Web-UI 定时任务',
      hasUserSpecifiedDescription: true,
      aliases: ['tasks', 'cron'],
      allowedTools: ['Read', 'Write', 'Bash'],
      argumentHint: '[list|run|enable|disable] [task-id]',
      whenToUse: '查看定时任务列表、启用/禁用任务、手动执行任务',
      contentLength: 0,
      source: 'webui',
      loadedFrom: 'webui-scheduled-tasks',
      isEnabled: () => true,
      isHidden: false,
      progressMessage: '获取定时任务...',
      disableModelInvocation: false,
      userInvocable: true,
      async getPromptForCommand(args: string, _context: ToolUseContext): Promise<ContentBlockParam[]> {
        const tasks = await getScheduledTasks()
        const stats = await fetchTaskStats()

        const parts = args.trim().split(/\s+/)
        const action = parts[0] || 'list'
        const taskId = parts[1]

        // 执行任务
        if (action === 'run' && taskId) {
          const result = await runTaskNow(taskId)
          return [
            {
              type: 'text',
              text: result.success
                ? `✅ 任务执行成功: ${taskId}`
                : `❌ 任务执行失败: ${result.message}`,
            },
          ]
        }

        // 启用任务
        if (action === 'enable' && taskId) {
          const result = await toggleTask(taskId, true)
          clearScheduledTasksCache()
          return [
            {
              type: 'text',
              text: result.success
                ? `✅ 已启用任务: ${taskId}`
                : `❌ 启用失败: ${result.message}`,
            },
          ]
        }

        // 禁用任务
        if (action === 'disable' && taskId) {
          const result = await toggleTask(taskId, false)
          clearScheduledTasksCache()
          return [
            {
              type: 'text',
              text: result.success
                ? `✅ 已暂停任务: ${taskId}`
                : `❌ 暂停失败: ${result.message}`,
            },
          ]
        }

        // 显示任务详情
        if (action === 'show' && taskId) {
          const task = tasks.find((t) => t.id === taskId)
          if (!task) {
            return [
              {
                type: 'text',
                text: `未找到任务: ${taskId}`,
              },
            ]
          }

          const successRate = task.totalRuns > 0
            ? ((task.successRuns / task.totalRuns) * 100).toFixed(1)
            : '0'

          return [
            {
              type: 'text',
              text: `## ${task.name}

**ID:** \`${task.id}\`
**描述:** ${task.description || '无'}
**智能体:** ${task.agentName || task.agentId}
**状态:** ${task.enabled ? '🟢 启用' : '⏸️ 暂停'}

### 调度配置
- **类型:** ${task.schedule.type}
- **值:** ${task.schedule.value}

### 执行统计
- **总执行:** ${task.totalRuns} 次
- **成功:** ${task.successRuns} 次
- **失败:** ${task.failRuns} 次
- **成功率:** ${successRate}%
- **上次执行:** ${task.lastRun ? formatDate(new Date(task.lastRun)) : '从未'}
- **下次执行:** ${task.nextRun ? formatDate(new Date(task.nextRun)) : '无计划'}

### 提示词
\`\`\`
${task.prompt}
\`\`\`

### 操作
- \`/scheduled-tasks run ${task.id}\` - 立即执行
- \`/scheduled-tasks ${task.enabled ? 'disable' : 'enable'} ${task.id}\` - ${task.enabled ? '暂停' : '启用'}任务`,
            },
          ]
        }

        // 默认：列出所有任务
        const header = stats
          ? `## Web-UI 定时任务 (${stats.enabled}/${stats.total} 启用)

执行统计: ${stats.totalRuns} 次执行 | ${stats.successRuns} 成功 | ${stats.failRuns} 失败`
          : '## Web-UI 定时任务'

        return [
          {
            type: 'text',
            text: `${header}

${formatTasksList(tasks)}

---

### 可用操作
- \`/scheduled-tasks\` - 查看任务列表
- \`/scheduled-tasks show <task-id>\` - 查看任务详情
- \`/scheduled-tasks run <task-id>\` - 立即执行
- \`/scheduled-tasks enable <task-id>\` - 启用任务
- \`/scheduled-tasks disable <task-id>\` - 暂停任务`,
          },
        ]
      },
    },
  ]

  return commands
}

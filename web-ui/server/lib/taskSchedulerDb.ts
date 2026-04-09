import { ClaudeSession } from './claudeSession'
import { agentSystemPrompts } from './ai'
import {
  getAllScheduledTasks,
  getScheduledTaskById,
  getEnabledScheduledTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
  createTaskResult,
  updateTaskResult,
  getTaskResults,
  updateTaskExecutionStats,
  updateTaskNextRun,
  type ScheduledTaskDB,
  type TaskResultDB,
} from '../db'

// ================== Types ==================
export type ScheduleType = 'once' | 'daily' | 'interval' | 'cron'

export interface ScheduleConfig {
  type: ScheduleType
  value: string
}

export interface TaskResult {
  id: string
  timestamp: Date
  status: 'success' | 'error' | 'running'
  output?: string
  error?: string
  duration?: number
}

export interface ScheduledTask {
  id: string
  name: string
  description?: string
  agentId: string
  agentName?: string
  sessionId?: string
  prompt: string
  schedule: ScheduleConfig
  enabled: boolean
  createdAt: Date
  updatedAt: Date
  lastRun?: Date
  nextRun?: Date
  totalRuns: number
  successRuns: number
  failRuns: number
  results: TaskResult[]
}

// ================== Task Scheduler ==================
const MAX_RESULTS_PER_TASK = 50

class TaskScheduler {
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private sessions: Map<string, ClaudeSession> = new Map()
  private initialized: boolean = false

  constructor() {
    this.init().catch(console.error)
  }

  // Initialize and schedule all enabled tasks
  private async init(): Promise<void> {
    try {
      const tasks = await getEnabledScheduledTasks()
      for (const task of tasks) {
        this.scheduleTask(this.dbToTask(task))
      }
      this.initialized = true
      console.log(`[TaskScheduler] Initialized and scheduled ${tasks.length} tasks`)
    } catch (err) {
      console.error('[TaskScheduler] Failed to initialize:', err)
    }
  }

  // Convert DB format to Task format
  private dbToTask(dbTask: ScheduledTaskDB): ScheduledTask {
    return {
      id: dbTask.id,
      name: dbTask.name,
      description: dbTask.description,
      agentId: dbTask.agent_id,
      agentName: dbTask.agent_name,
      sessionId: dbTask.session_id,
      prompt: dbTask.prompt,
      schedule: {
        type: dbTask.schedule_type,
        value: dbTask.schedule_value,
      },
      enabled: dbTask.enabled,
      createdAt: dbTask.created_at,
      updatedAt: dbTask.updated_at,
      lastRun: dbTask.last_run_at,
      nextRun: dbTask.next_run_at,
      totalRuns: dbTask.total_runs,
      successRuns: dbTask.success_runs,
      failRuns: dbTask.fail_runs,
      results: [],
    }
  }

  // Convert TaskResultDB to TaskResult
  private dbToResult(dbResult: TaskResultDB): TaskResult {
    return {
      id: dbResult.id,
      timestamp: dbResult.created_at,
      status: dbResult.status,
      output: dbResult.output,
      error: dbResult.error_message,
      duration: dbResult.duration_ms,
    }
  }

  // Schedule a task based on its configuration
  private scheduleTask(task: ScheduledTask): void {
    this.clearTaskTimer(task.id)

    const nextRun = this.calculateNextRun(task.schedule)
    if (!nextRun) {
      console.log(`[TaskScheduler] Task ${task.id} has no next run time`)
      return
    }

    task.nextRun = nextRun
    updateTaskNextRun(task.id, nextRun).catch(console.error)

    const delay = nextRun.getTime() - Date.now()

    if (delay < 0) {
      if (task.schedule.type === 'once') {
        console.log(`[TaskScheduler] One-time task ${task.id} has expired`)
        return
      }
      this.scheduleTask(task)
      return
    }

    console.log(`[TaskScheduler] Task ${task.id} scheduled for ${nextRun.toISOString()}`)

    const timer = setTimeout(() => {
      this.executeTask(task.id)
    }, delay)

    this.timers.set(task.id, timer)
  }

  // Clear task timer
  private clearTaskTimer(taskId: string): void {
    const timer = this.timers.get(taskId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(taskId)
    }
  }

  // Calculate next run time
  private calculateNextRun(schedule: ScheduleConfig): Date | null {
    const now = new Date()

    switch (schedule.type) {
      case 'once': {
        const date = new Date(schedule.value)
        return date > now ? date : null
      }

      case 'daily': {
        const [hours, minutes] = schedule.value.split(':').map(Number)
        const next = new Date()
        next.setHours(hours, minutes, 0, 0)
        if (next <= now) {
          next.setDate(next.getDate() + 1)
        }
        return next
      }

      case 'interval': {
        const minutes = parseInt(schedule.value, 10)
        if (isNaN(minutes) || minutes <= 0) return null
        return new Date(now.getTime() + minutes * 60 * 1000)
      }

      case 'cron': {
        try {
          return this.parseSimpleCron(schedule.value)
        } catch {
          console.error('[TaskScheduler] Invalid cron expression:', schedule.value)
          return null
        }
      }

      default:
        return null
    }
  }

  // Parse simple cron expressions
  private parseSimpleCron(cron: string): Date {
    const parts = cron.split(' ')
    if (parts.length !== 5) {
      throw new Error('Invalid cron format')
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
    const now = new Date()
    const next = new Date(now)

    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
    } else if (dayOfWeek !== '*') {
      const targetDay = parseInt(dayOfWeek, 10)
      const currentDay = now.getDay()
      const daysUntilTarget = (targetDay - currentDay + 7) % 7
      next.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))
      next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0)
    } else {
      next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0)
      next.setDate(next.getDate() + 1)
    }

    return next
  }

  // Execute a task
  private async executeTask(taskId: string): Promise<void> {
    const dbTask = await getScheduledTaskById(taskId)
    if (!dbTask || !dbTask.enabled) return

    console.log(`[TaskScheduler] Executing task: ${dbTask.name}`)

    const task = this.dbToTask(dbTask)
    const resultId = await createTaskResult({
      task_id: taskId,
      status: 'running',
    })

    const startTime = Date.now()
    let output = ''

    try {
      let session = this.sessions.get(taskId)
      if (!session) {
        const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          throw new Error('AI service not configured')
        }

        session = new ClaudeSession({
          apiKey,
          baseURL: process.env.ANTHROPIC_BASE_URL,
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
          onEvent: (event) => {
            if (event.type === 'assistant_text') {
              output += event.text
            }
          },
        })
        this.sessions.set(taskId, session)
      }

      const systemPrompt = agentSystemPrompts[task.agentId] || agentSystemPrompts.default
      await session.submitUserMessage(task.prompt, systemPrompt)

      const duration = Date.now() - startTime

      await updateTaskResult(resultId, {
        status: 'success',
        output,
        duration_ms: duration,
      })

      await updateTaskExecutionStats(taskId, 'success', duration)

      console.log(`[TaskScheduler] Task ${task.name} completed successfully`)
    } catch (err) {
      const duration = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : String(err)

      await updateTaskResult(resultId, {
        status: 'error',
        error_message: errorMessage,
        duration_ms: duration,
      })

      await updateTaskExecutionStats(taskId, 'error', duration)

      console.error(`[TaskScheduler] Task ${task.name} failed:`, err)
    }

    if (task.enabled && task.schedule.type !== 'once') {
      this.scheduleTask(task)
    }
  }

  // ================== Public API ==================

  // Get all tasks
  async getAllTasks(): Promise<ScheduledTask[]> {
    const dbTasks = await getAllScheduledTasks()
    const tasks: ScheduledTask[] = []

    for (const dbTask of dbTasks) {
      const task = this.dbToTask(dbTask)
      const results = await getTaskResults(task.id, MAX_RESULTS_PER_TASK)
      task.results = results.map(r => this.dbToResult(r))
      tasks.push(task)
    }

    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Get task by ID
  async getTask(id: string): Promise<ScheduledTask | null> {
    const dbTask = await getScheduledTaskById(id)
    if (!dbTask) return null

    const task = this.dbToTask(dbTask)
    const results = await getTaskResults(task.id, MAX_RESULTS_PER_TASK)
    task.results = results.map(r => this.dbToResult(r))
    return task
  }

  // Create new task
  async createTask(data: {
    name: string
    description?: string
    agentId: string
    agentName?: string
    sessionId?: string
    prompt: string
    schedule: ScheduleConfig
    enabled: boolean
  }): Promise<ScheduledTask> {
    const taskId = await createScheduledTask({
      name: data.name,
      description: data.description,
      agent_id: data.agentId,
      agent_name: data.agentName,
      session_id: data.sessionId,
      prompt: data.prompt,
      schedule_type: data.schedule.type,
      schedule_value: data.schedule.value,
      enabled: data.enabled,
    })

    const task = await this.getTask(taskId)
    if (!task) {
      throw new Error('Failed to create task')
    }

    if (task.enabled) {
      this.scheduleTask(task)
    }

    return task
  }

  // Update task
  async updateTask(id: string, data: Partial<{
    name: string
    description: string
    agentId: string
    agentName: string
    sessionId: string
    prompt: string
    schedule: ScheduleConfig
    enabled: boolean
  }>): Promise<ScheduledTask | null> {
    const success = await updateScheduledTask(id, {
      name: data.name,
      description: data.description,
      agent_id: data.agentId,
      agent_name: data.agentName,
      session_id: data.sessionId,
      prompt: data.prompt,
      schedule_type: data.schedule?.type,
      schedule_value: data.schedule?.value,
      enabled: data.enabled,
    })

    if (!success) return null

    this.clearTaskTimer(id)

    const task = await this.getTask(id)
    if (task && task.enabled) {
      this.scheduleTask(task)
    }

    return task
  }

  // Toggle task enabled state
  async toggleTask(id: string, enabled: boolean): Promise<ScheduledTask | null> {
    const success = await toggleScheduledTask(id, enabled)
    if (!success) return null

    const task = await this.getTask(id)
    if (!task) return null

    if (enabled) {
      this.scheduleTask(task)
    } else {
      this.clearTaskTimer(id)
      await updateTaskNextRun(id, null)
      task.nextRun = undefined
    }

    return task
  }

  // Delete task
  async deleteTask(id: string): Promise<boolean> {
    this.clearTaskTimer(id)
    this.sessions.delete(id)
    return await deleteScheduledTask(id)
  }

  // Run task immediately (manual trigger)
  async runTaskNow(id: string): Promise<TaskResult | null> {
    const task = await this.getTask(id)
    if (!task) return null

    await this.executeTask(id)

    const results = await getTaskResults(id, 1)
    if (results.length > 0) {
      return this.dbToResult(results[0])
    }
    return null
  }

  // Get task results
  async getTaskResults(id: string): Promise<TaskResult[]> {
    const results = await getTaskResults(id, MAX_RESULTS_PER_TASK)
    return results.map(r => this.dbToResult(r))
  }
}

// Singleton instance
export const taskScheduler = new TaskScheduler()

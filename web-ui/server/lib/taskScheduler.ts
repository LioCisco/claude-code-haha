import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { agentSystemPrompts } from './ai'
import { ClaudeSession } from './claudeSession'

// ================== Types ==================
export type ScheduleType = 'once' | 'daily' | 'interval' | 'cron'

export interface ScheduleConfig {
  type: ScheduleType
  value: string // ISO datetime for 'once', cron expression for 'cron', minutes for 'interval', 'HH:mm' for 'daily'
}

export interface TaskResult {
  id: string
  timestamp: Date
  status: 'success' | 'error' | 'running'
  output?: string
  error?: string
  duration?: number // milliseconds
}

export interface ScheduledTask {
  id: string
  name: string
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
  results: TaskResult[]
}

interface TasksStorage {
  tasks: ScheduledTask[]
}

// ================== Task Scheduler ==================
const TASKS_FILE = join(process.cwd(), 'data', 'scheduled-tasks.json')
const MAX_RESULTS_PER_TASK = 50

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private sessions: Map<string, ClaudeSession> = new Map()

  constructor() {
    this.loadTasks().catch(console.error)
  }

  // Load tasks from disk
  private async loadTasks(): Promise<void> {
    try {
      if (!existsSync(TASKS_FILE)) {
        await mkdir(join(process.cwd(), 'data'), { recursive: true })
        await writeFile(TASKS_FILE, JSON.stringify({ tasks: [] }))
        return
      }

      const content = await readFile(TASKS_FILE, 'utf-8')
      const data: TasksStorage = JSON.parse(content)

      for (const task of data.tasks) {
        // Restore dates
        task.createdAt = new Date(task.createdAt)
        task.updatedAt = new Date(task.updatedAt)
        if (task.lastRun) task.lastRun = new Date(task.lastRun)
        if (task.nextRun) task.nextRun = new Date(task.nextRun)
        for (const result of task.results) {
          result.timestamp = new Date(result.timestamp)
        }

        this.tasks.set(task.id, task)
        if (task.enabled) {
          this.scheduleTask(task)
        }
      }

      console.log(`[TaskScheduler] Loaded ${this.tasks.size} tasks`)
    } catch (err) {
      console.error('[TaskScheduler] Failed to load tasks:', err)
    }
  }

  // Save tasks to disk
  private async saveTasks(): Promise<void> {
    try {
      const data: TasksStorage = {
        tasks: Array.from(this.tasks.values()),
      }
      await writeFile(TASKS_FILE, JSON.stringify(data, null, 2))
    } catch (err) {
      console.error('[TaskScheduler] Failed to save tasks:', err)
    }
  }

  // Schedule a task based on its configuration
  private scheduleTask(task: ScheduledTask): void {
    // Clear existing timer
    this.clearTaskTimer(task.id)

    const nextRun = this.calculateNextRun(task.schedule)
    if (!nextRun) {
      console.log(`[TaskScheduler] Task ${task.id} has no next run time`)
      return
    }

    task.nextRun = nextRun
    const delay = nextRun.getTime() - Date.now()

    if (delay < 0) {
      // If the time has passed, run immediately or skip based on type
      if (task.schedule.type === 'once') {
        console.log(`[TaskScheduler] One-time task ${task.id} has expired`)
        return
      }
      // For recurring tasks, recalculate
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
        // value format: "HH:mm" (e.g., "09:30")
        const [hours, minutes] = schedule.value.split(':').map(Number)
        const next = new Date()
        next.setHours(hours, minutes, 0, 0)
        if (next <= now) {
          next.setDate(next.getDate() + 1)
        }
        return next
      }

      case 'interval': {
        // value: minutes (e.g., "60" for every hour)
        const minutes = parseInt(schedule.value, 10)
        if (isNaN(minutes) || minutes <= 0) return null
        return new Date(now.getTime() + minutes * 60 * 1000)
      }

      case 'cron': {
        // Simple cron parser (only supports basic patterns like "0 9 * * *")
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

    // Simple implementation: set to next occurrence
    // This is a basic implementation - for production, use a proper cron library
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      // Daily at specific time
      next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
    } else {
      // For more complex patterns, default to tomorrow at specified time
      next.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0)
      next.setDate(next.getDate() + 1)
    }

    return next
  }

  // Execute a task
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task || !task.enabled) return

    console.log(`[TaskScheduler] Executing task: ${task.name}`)

    const resultId = Math.random().toString(36).substring(2, 15)
    const result: TaskResult = {
      id: resultId,
      timestamp: new Date(),
      status: 'running',
    }

    // Add result to task
    task.results.push(result)
    if (task.results.length > MAX_RESULTS_PER_TASK) {
      task.results.shift() // Remove oldest
    }

    const startTime = Date.now()

    try {
      // Get or create session
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
            // Store events for later retrieval
            this.storeEvent(resultId, event)
          },
        })
        this.sessions.set(taskId, session)
      }

      // Get system prompt for agent
      const systemPrompt = agentSystemPrompts[task.agentId] || agentSystemPrompts.default

      // Execute the prompt
      await session.submitUserMessage(task.prompt, systemPrompt)

      // Update result
      result.status = 'success'
      result.output = this.getExecutionOutput(resultId)
      result.duration = Date.now() - startTime

      console.log(`[TaskScheduler] Task ${task.name} completed successfully`)
    } catch (err) {
      result.status = 'error'
      result.error = err instanceof Error ? err.message : String(err)
      result.duration = Date.now() - startTime
      console.error(`[TaskScheduler] Task ${task.name} failed:`, err)
    }

    // Update task
    task.lastRun = new Date()
    await this.saveTasks()

    // Reschedule if recurring
    if (task.enabled && task.schedule.type !== 'once') {
      this.scheduleTask(task)
    }
  }

  // Store event during execution (simplified - in production, store in memory or DB)
  private eventStore: Map<string, any[]> = new Map()

  private storeEvent(resultId: string, event: any): void {
    const events = this.eventStore.get(resultId) || []
    events.push(event)
    this.eventStore.set(resultId, events)
  }

  private getExecutionOutput(resultId: string): string {
    const events = this.eventStore.get(resultId) || []
    // Combine text events
    return events
      .filter((e) => e.type === 'assistant_text')
      .map((e) => e.text)
      .join('')
  }

  // ================== Public API ==================

  // Get all tasks
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // Get task by ID
  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id)
  }

  // Create new task
  async createTask(data: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'results'>): Promise<ScheduledTask> {
    const task: ScheduledTask = {
      ...data,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date(),
      updatedAt: new Date(),
      results: [],
    }

    this.tasks.set(task.id, task)

    if (task.enabled) {
      this.scheduleTask(task)
    }

    await this.saveTasks()
    return task
  }

  // Update task
  async updateTask(id: string, data: Partial<Omit<ScheduledTask, 'id' | 'createdAt'>>): Promise<ScheduledTask | null> {
    const task = this.tasks.get(id)
    if (!task) return null

    Object.assign(task, data, { updatedAt: new Date() })

    // Reschedule if needed
    this.clearTaskTimer(id)
    if (task.enabled) {
      this.scheduleTask(task)
    }

    await this.saveTasks()
    return task
  }

  // Toggle task enabled state
  async toggleTask(id: string, enabled: boolean): Promise<ScheduledTask | null> {
    const task = this.tasks.get(id)
    if (!task) return null

    task.enabled = enabled
    task.updatedAt = new Date()

    if (enabled) {
      this.scheduleTask(task)
    } else {
      this.clearTaskTimer(id)
      task.nextRun = undefined
    }

    await this.saveTasks()
    return task
  }

  // Delete task
  async deleteTask(id: string): Promise<boolean> {
    this.clearTaskTimer(id)
    this.sessions.delete(id)
    const deleted = this.tasks.delete(id)
    if (deleted) {
      await this.saveTasks()
    }
    return deleted
  }

  // Run task immediately (manual trigger)
  async runTaskNow(id: string): Promise<TaskResult | null> {
    const task = this.tasks.get(id)
    if (!task) return null

    await this.executeTask(id)
    return task.results[task.results.length - 1] || null
  }

  // Get task results
  getTaskResults(id: string): TaskResult[] {
    const task = this.tasks.get(id)
    return task?.results || []
  }
}

// Singleton instance
export const taskScheduler = new TaskScheduler()

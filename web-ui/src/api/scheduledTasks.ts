import type { ScheduledTask, TaskResult, ScheduleConfig } from '@/types'

export interface CreateTaskInput {
  name: string
  description?: string
  agentId: string
  agentName?: string
  sessionId?: string
  prompt: string
  schedule: ScheduleConfig
  enabled?: boolean
}

export interface UpdateTaskInput {
  name?: string
  description?: string
  agentId?: string
  agentName?: string
  sessionId?: string
  prompt?: string
  schedule?: ScheduleConfig
  enabled?: boolean
}

export interface TaskStats {
  total: number
  enabled: number
  totalRuns: number
  successRuns: number
  failRuns: number
}

export interface RecentExecution {
  taskId: string
  taskName: string
  result: TaskResult
}

// Get all scheduled tasks
export async function getScheduledTasks(): Promise<ScheduledTask[]> {
  const res = await fetch('/api/scheduled-tasks')
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch tasks')
  }
  return data.tasks || []
}

// Get single task
export async function getScheduledTask(id: string): Promise<ScheduledTask> {
  const res = await fetch(`/api/scheduled-tasks/${id}`)
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Task not found')
  }
  return data.task
}

// Create new task
export async function createScheduledTask(input: CreateTaskInput): Promise<ScheduledTask> {
  const res = await fetch('/api/scheduled-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to create task')
  }
  return data.task
}

// Update task
export async function updateScheduledTask(
  id: string,
  input: UpdateTaskInput
): Promise<ScheduledTask> {
  const res = await fetch(`/api/scheduled-tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to update task')
  }
  return data.task
}

// Toggle task enabled
export async function toggleScheduledTask(
  id: string,
  enabled: boolean
): Promise<ScheduledTask> {
  const res = await fetch(`/api/scheduled-tasks/${id}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to toggle task')
  }
  return data.task
}

// Delete task
export async function deleteScheduledTask(id: string): Promise<void> {
  const res = await fetch(`/api/scheduled-tasks/${id}`, {
    method: 'DELETE',
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to delete task')
  }
}

// Run task immediately
export async function runTaskNow(id: string): Promise<TaskResult> {
  const res = await fetch(`/api/scheduled-tasks/${id}/run`, {
    method: 'POST',
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to run task')
  }
  return data.result
}

// Get task results
export async function getTaskResults(id: string): Promise<TaskResult[]> {
  const res = await fetch(`/api/scheduled-tasks/${id}/results`)
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch results')
  }
  return data.results || []
}

// Get task stats
export async function getTaskStats(): Promise<TaskStats> {
  const res = await fetch('/api/scheduled-tasks/stats/overview')
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch stats')
  }
  return data.stats
}

// Get recent executions
export async function getRecentExecutions(limit = 20): Promise<RecentExecution[]> {
  const res = await fetch(`/api/scheduled-tasks/executions/recent?limit=${limit}`)
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch executions')
  }
  return data.executions || []
}

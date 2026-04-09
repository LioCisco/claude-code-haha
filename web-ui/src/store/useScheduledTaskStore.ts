import { create } from 'zustand'
import type { ScheduledTask, TaskResult } from '@/types'

interface ScheduledTaskState {
  tasks: ScheduledTask[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchTasks: () => Promise<void>
  createTask: (task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt' | 'results'>) => Promise<void>
  updateTask: (id: string, updates: Partial<ScheduledTask>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTask: (id: string, enabled: boolean) => Promise<void>
  runTaskNow: (id: string) => Promise<void>
}

const API_URL = 'http://localhost:8080'

export const useScheduledTaskStore = create<ScheduledTaskState>()((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/api/scheduled-tasks`)
      const data = await res.json()
      if (data.success) {
        // Convert date strings to Date objects
        const tasks = data.tasks.map((t: ScheduledTask) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          lastRun: t.lastRun ? new Date(t.lastRun) : undefined,
          nextRun: t.nextRun ? new Date(t.nextRun) : undefined,
          results: t.results?.map((r: TaskResult) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          })) || [],
        }))
        set({ tasks, isLoading: false })
      } else {
        set({ error: data.message || 'Failed to fetch tasks', isLoading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Network error', isLoading: false })
    }
  },

  createTask: async (task) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/api/scheduled-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      const data = await res.json()
      if (data.success) {
        await get().fetchTasks()
      } else {
        set({ error: data.message || 'Failed to create task', isLoading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Network error', isLoading: false })
    }
  },

  updateTask: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/api/scheduled-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) {
        await get().fetchTasks()
      } else {
        set({ error: data.message || 'Failed to update task', isLoading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Network error', isLoading: false })
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${API_URL}/api/scheduled-tasks/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          isLoading: false,
        }))
      } else {
        set({ error: data.message || 'Failed to delete task', isLoading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Network error', isLoading: false })
    }
  },

  toggleTask: async (id, enabled) => {
    try {
      const res = await fetch(`${API_URL}/api/scheduled-tasks/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (data.success) {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, enabled, nextRun: data.task.nextRun ? new Date(data.task.nextRun) : undefined } : t
          ),
        }))
      }
    } catch (err) {
      console.error('Failed to toggle task:', err)
    }
  },

  runTaskNow: async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/scheduled-tasks/${id}/run`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        // 立即刷新任务列表以显示 running 状态
        await get().fetchTasks()

        // 如果任务正在执行，启动轮询以实时更新状态
        const task = get().tasks.find(t => t.id === id)
        const hasRunning = task?.results?.some(r => r.status === 'running')

        if (hasRunning) {
          // 每 2 秒轮询一次，最多 30 次（1分钟）
          let pollCount = 0
          const pollInterval = setInterval(async () => {
            await get().fetchTasks()
            pollCount++

            // 检查是否还有 running 状态
            const updatedTask = get().tasks.find(t => t.id === id)
            const stillRunning = updatedTask?.results?.some(r => r.status === 'running')

            if (!stillRunning || pollCount >= 30) {
              clearInterval(pollInterval)
            }
          }, 2000)
        }
      }
    } catch (err) {
      console.error('Failed to run task:', err)
    }
  },
}))

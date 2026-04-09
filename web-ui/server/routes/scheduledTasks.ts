import { Elysia, t } from 'elysia'
import { taskScheduler } from '../lib/taskSchedulerDb'

const scheduleConfigSchema = t.Object({
  type: t.Union([t.Literal('once'), t.Literal('daily'), t.Literal('interval'), t.Literal('cron')]),
  value: t.String(),
})

export const scheduledTaskRoutes = new Elysia({ prefix: '/api/scheduled-tasks' })
  // Get all tasks
  .get('/', async () => {
    const tasks = await taskScheduler.getAllTasks()
    return {
      success: true,
      tasks,
    }
  })

  // Get single task
  .get('/:id', async ({ params, set }) => {
    const task = await taskScheduler.getTask(params.id)
    if (!task) {
      set.status = 404
      return { success: false, message: 'Task not found' }
    }
    return { success: true, task }
  })

  // Create task
  .post(
    '/',
    async ({ body }) => {
      const task = await taskScheduler.createTask(body)
      return { success: true, task }
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        agentId: t.String(),
        agentName: t.Optional(t.String()),
        sessionId: t.Optional(t.String()),
        prompt: t.String(),
        schedule: scheduleConfigSchema,
        enabled: t.Boolean(),
      }),
    }
  )

  // Update task
  .put(
    '/:id',
    async ({ params, body, set }) => {
      const task = await taskScheduler.updateTask(params.id, body)
      if (!task) {
        set.status = 404
        return { success: false, message: 'Task not found' }
      }
      return { success: true, task }
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String(),
          description: t.String(),
          agentId: t.String(),
          agentName: t.Optional(t.String()),
          sessionId: t.Optional(t.String()),
          prompt: t.String(),
          schedule: scheduleConfigSchema,
          enabled: t.Boolean(),
        })
      ),
    }
  )

  // Toggle task enabled
  .post('/:id/toggle', async ({ params, body, set }) => {
    const task = await taskScheduler.toggleTask(params.id, body.enabled)
    if (!task) {
      set.status = 404
      return { success: false, message: 'Task not found' }
    }
    return { success: true, task }
  }, {
    body: t.Object({
      enabled: t.Boolean(),
    }),
  })

  // Delete task
  .delete('/:id', async ({ params, set }) => {
    const deleted = await taskScheduler.deleteTask(params.id)
    if (!deleted) {
      set.status = 404
      return { success: false, message: 'Task not found' }
    }
    return { success: true, message: 'Task deleted' }
  })

  // Run task immediately
  .post('/:id/run', async ({ params, set }) => {
    const result = await taskScheduler.runTaskNow(params.id)
    if (!result) {
      set.status = 404
      return { success: false, message: 'Task not found' }
    }
    return { success: true, result }
  })

  // Get task results
  .get('/:id/results', async ({ params, set }) => {
    const task = await taskScheduler.getTask(params.id)
    if (!task) {
      set.status = 404
      return { success: false, message: 'Task not found' }
    }
    const results = await taskScheduler.getTaskResults(params.id)
    return {
      success: true,
      results,
    }
  })

  // Get task statistics
  .get('/stats/overview', async () => {
    const tasks = await taskScheduler.getAllTasks()
    const stats = {
      total: tasks.length,
      enabled: tasks.filter(t => t.enabled).length,
      totalRuns: tasks.reduce((sum, t) => sum + t.totalRuns, 0),
      successRuns: tasks.reduce((sum, t) => sum + t.successRuns, 0),
      failRuns: tasks.reduce((sum, t) => sum + t.failRuns, 0),
    }
    return { success: true, stats }
  })

  // Get recent executions across all tasks
  .get('/executions/recent', async ({ query }) => {
    const limit = parseInt(query.limit as string || '20')
    const tasks = await taskScheduler.getAllTasks()

    // Collect all results from all tasks
    const allExecutions: Array<{
      taskId: string
      taskName: string
      result: any
    }> = []

    for (const task of tasks) {
      for (const result of task.results.slice(0, 5)) {
        allExecutions.push({
          taskId: task.id,
          taskName: task.name,
          result,
        })
      }
    }

    // Sort by timestamp descending
    allExecutions.sort((a, b) =>
      new Date(b.result.timestamp).getTime() - new Date(a.result.timestamp).getTime()
    )

    return {
      success: true,
      executions: allExecutions.slice(0, limit),
    }
  })

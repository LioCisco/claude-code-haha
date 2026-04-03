import { Elysia, t } from 'elysia'
import { taskScheduler } from '../lib/taskScheduler'

const scheduleConfigSchema = t.Object({
  type: t.Union([t.Literal('once'), t.Literal('daily'), t.Literal('interval'), t.Literal('cron')]),
  value: t.String(),
})

export const scheduledTaskRoutes = new Elysia({ prefix: '/api/scheduled-tasks' })
  // Get all tasks
  .get('/', () => {
    return {
      success: true,
      tasks: taskScheduler.getAllTasks(),
    }
  })

  // Get single task
  .get('/:id', ({ params, set }) => {
    const task = taskScheduler.getTask(params.id)
    if (!task) {
      set.status = 404
      return { success: false, message: 'Task not found' }
    }
    return { success: true, task }
  })

  // Create task
  .post(
    '/',
    ({ body }) => {
      const task = taskScheduler.createTask(body)
      return { success: true, task }
    },
    {
      body: t.Object({
        name: t.String(),
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
    ({ params, body, set }) => {
      const task = taskScheduler.updateTask(params.id, body)
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
  .post('/:id/toggle', ({ params, body, set }) => {
    const task = taskScheduler.toggleTask(params.id, body.enabled)
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
  .delete('/:id', ({ params, set }) => {
    const deleted = taskScheduler.deleteTask(params.id)
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
  .get('/:id/results', ({ params, set }) => {
    const task = taskScheduler.getTask(params.id)
    if (!task) {
      set.status = 404
      return { success: false, message: 'Task not found' }
    }
    return {
      success: true,
      results: task.results,
    }
  })

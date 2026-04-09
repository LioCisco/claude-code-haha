/**
 * 工作流 API 路由
 */

import { Elysia, t } from 'elysia'
import { v4 as uuidv4 } from 'uuid'
import {
  getUserWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  incrementWorkflowExecutionCount,
  createExecutionRecord,
  updateExecutionStatus,
  getWorkflowExecutions,
  createPublishRecord,
  getPublishHistory,
} from '../db'
import { workflowEngine } from '../engine/WorkflowEngine'
import { registerAllExecutors } from '../nodes'

// 注册所有节点执行器
registerAllExecutors()

// 获取用户 ID（从请求上下文，由 authMiddleware 设置）
function getUserId(request: any): string {
  // 从 authMiddleware 设置的用户信息中获取
  if (request.user?.id) {
    return request.user.id
  }
  // 降级：从 query 获取（仅用于开发测试）
  return 'default-user'
}

export const workflowRoutes = new Elysia({ prefix: '/api/workflows' })
  // 获取工作流列表
  .get('/', async ({ request, query, headers }): Promise<any> => {
    const userId = getUserId(request)
    const workflows = await getUserWorkflows(userId)

    return {
      success: true,
      workflows: workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        status: w.status,
        version: w.version,
        isPublic: Boolean(w.is_public),
        executionCount: w.execution_count,
        lastExecutionAt: w.last_execution_at,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })),
    }
  })

  // 获取单个工作流
  .get('/:id', async ({ request, params, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const workflow = await getWorkflowById(params.id, userId)

    if (!workflow) {
      set.status = 404
      return { success: false, message: '工作流不存在' }
    }

    return {
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        status: workflow.status,
        isPublic: Boolean(workflow.is_public),
        nodes: typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes,
        edges: typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges,
        variables: typeof workflow.variables === 'string' ? JSON.parse(workflow.variables) : workflow.variables || [],
        executionCount: workflow.execution_count,
        lastExecutionAt: workflow.last_execution_at,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
      },
    }
  })

  // 创建工作流
  .post('/', async ({ request, body, query, headers }): Promise<any> => {
    const userId = getUserId(request)
    const data = body as any

    const workflowId = uuidv4()
    await createWorkflow({
      id: workflowId,
      userId,
      name: data.name,
      description: data.description,
      nodes: data.nodes || [],
      edges: data.edges || [],
      variables: data.variables || [],
    })

    return {
      success: true,
      workflowId,
      message: '工作流创建成功',
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      nodes: t.Optional(t.Array(t.Any())),
      edges: t.Optional(t.Array(t.Any())),
      variables: t.Optional(t.Array(t.Any())),
    }),
  })

  // 更新工作流
  .put('/:id', async ({ request, params, body, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const data = body as any

    const success = await updateWorkflow(params.id, userId, {
      name: data.name,
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
      variables: data.variables,
      status: data.status,
      isPublic: data.isPublic,
    })

    if (!success) {
      set.status = 404
      return { success: false, message: '工作流不存在或无权修改' }
    }

    return {
      success: true,
      message: '工作流更新成功',
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      nodes: t.Optional(t.Array(t.Any())),
      edges: t.Optional(t.Array(t.Any())),
      variables: t.Optional(t.Array(t.Any())),
      status: t.Optional(t.Union([t.Literal('draft'), t.Literal('active'), t.Literal('disabled')])),
      isPublic: t.Optional(t.Boolean()),
    }),
  })

  // 删除工作流
  .delete('/:id', async ({ request, params, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const success = await deleteWorkflow(params.id, userId)

    if (!success) {
      set.status = 404
      return { success: false, message: '工作流不存在或无权删除' }
    }

    return {
      success: true,
      message: '工作流删除成功',
    }
  })

  // 执行工作流
  .post('/:id/execute', async ({ request, params, body, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const workflow = await getWorkflowById(params.id, userId)

    if (!workflow) {
      set.status = 404
      return { success: false, message: '工作流不存在' }
    }

    const executionId = uuidv4()
    const runId = uuidv4()

    // 创建工作流定义
    const workflowDef = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || '',
      version: workflow.version,
      nodes: typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes,
      edges: typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges,
      variables: typeof workflow.variables === 'string' ? JSON.parse(workflow.variables) : workflow.variables || [],
    }

    // 创建执行记录
    await createExecutionRecord({
      id: executionId,
      workflowId: params.id,
      userId,
      runId,
      input: body,
    })

    // 更新执行状态为运行中
    await updateExecutionStatus(executionId, { status: 'running' })

    try {
      // 执行工作流
      const startTime = Date.now()
      const result = await workflowEngine.runWorkflowFromCanvas(workflowDef)
      const duration = Date.now() - startTime

      // 更新执行记录
      await updateExecutionStatus(executionId, {
        status: result.status === 'success' ? 'success' : 'error',
        output: result.output,
        steps: result.steps,
        variables: result.variables,
        endedAt: new Date(),
        durationMs: duration,
      })

      // 增加执行计数
      await incrementWorkflowExecutionCount(params.id)

      return {
        success: result.status === 'success',
        runId,
        executionId,
        result,
      }
    } catch (error) {
      // 更新执行记录为错误
      await updateExecutionStatus(executionId, {
        status: 'error',
        errorMessage: String(error),
        endedAt: new Date(),
      })

      return {
        success: false,
        runId,
        executionId,
        error: String(error),
      }
    }
  }, {
    body: t.Optional(t.Record(t.String(), t.Any())),
  })

  // 获取执行记录
  .get('/:id/executions', async ({ request, params, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const workflow = await getWorkflowById(params.id, userId)

    if (!workflow) {
      set.status = 404
      return { success: false, message: '工作流不存在' }
    }

    const executions = await getWorkflowExecutions(params.id, 50)

    return {
      success: true,
      executions: executions.map(e => ({
        id: e.id,
        runId: e.run_id,
        status: e.status,
        input: e.input,
        output: e.output,
        errorMessage: e.error_message,
        durationMs: e.duration_ms,
        startedAt: e.started_at,
        endedAt: e.ended_at,
        createdAt: e.created_at,
      })),
    }
  })

  // 导出工作流
  .get('/:id/export', async ({ request, params, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const workflow = await getWorkflowById(params.id, userId)

    if (!workflow) {
      set.status = 404
      return { success: false, message: '工作流不存在' }
    }

    const exportData = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: workflow.version,
      nodes: typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes,
      edges: typeof workflow.edges === 'string' ? JSON.parse(workflow.edges) : workflow.edges,
      variables: typeof workflow.variables === 'string' ? JSON.parse(workflow.variables) : workflow.variables || [],
      exportedAt: new Date().toISOString(),
    }

    return {
      success: true,
      data: exportData,
    }
  })

  // 导入工作流
  .post('/import', async ({ request, body, query, headers }): Promise<any> => {
    const userId = getUserId(request)
    const data = body as any

    const workflowId = uuidv4()
    await createWorkflow({
      id: workflowId,
      userId,
      name: data.name || '导入的工作流',
      description: data.description,
      nodes: data.nodes || [],
      edges: data.edges || [],
      variables: data.variables || [],
    })

    return {
      success: true,
      workflowId,
      message: '工作流导入成功',
    }
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      nodes: t.Array(t.Any()),
      edges: t.Array(t.Any()),
      variables: t.Optional(t.Array(t.Any())),
    }),
  })

  // 发布工作流
  .post('/:id/publish', async ({ request, params, body, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const workflow = await getWorkflowById(params.id, userId)

    if (!workflow) {
      set.status = 404
      return { success: false, message: '工作流不存在' }
    }

    const data = body as any
    const newVersion = data.version || workflow.version
    const changes = data.changes || ''

    try {
      // 更新工作流状态和版本
      await updateWorkflow(params.id, userId, {
        status: 'active',
        version: newVersion,
      })

      // 创建发布记录
      await createPublishRecord({
        id: uuidv4(),
        workflowId: params.id,
        userId,
        version: newVersion,
        changes,
        nodes: workflow.nodes,
        edges: workflow.edges,
        variables: workflow.variables,
      })

      return {
        success: true,
        message: '工作流发布成功',
        version: newVersion,
      }
    } catch (error) {
      set.status = 500
      return { success: false, message: '发布失败: ' + String(error) }
    }
  }, {
    body: t.Object({
      version: t.Optional(t.String()),
      changes: t.Optional(t.String()),
    }),
  })

  // 获取发布历史
  .get('/:id/publish-history', async ({ request, params, query, headers, set }): Promise<any> => {
    const userId = getUserId(request)
    const workflow = await getWorkflowById(params.id, userId)

    if (!workflow) {
      set.status = 404
      return { success: false, message: '工作流不存在' }
    }

    try {
      const history = await getPublishHistory(params.id)

      return {
        success: true,
        history: history.map(h => ({
          id: h.id,
          version: h.version,
          changes: h.changes,
          publishedAt: h.published_at,
          publishedBy: h.published_by,
        })),
      }
    } catch (error) {
      set.status = 500
      return { success: false, message: '获取发布历史失败: ' + String(error) }
    }
  })

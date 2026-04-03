import { useState, useEffect } from 'react'
import {
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bot,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Edit3,
} from 'lucide-react'
import { useScheduledTaskStore } from '@/store/useScheduledTaskStore'
import { useChatStore } from '@/store/useChatStore'
import type { ScheduledTask, ScheduleType, TaskResult } from '@/types'
import { cn, formatTime } from '@/lib/utils'

const scheduleTypeLabels: Record<ScheduleType, string> = {
  once: '单次执行',
  daily: '每天',
  interval: '间隔',
  cron: 'Cron表达式',
}

const scheduleTypePlaceholders: Record<ScheduleType, string> = {
  once: '例如: 2025-12-31T09:00:00',
  daily: '例如: 09:00',
  interval: '例如: 60 (分钟)',
  cron: '例如: 0 9 * * *',
}

export default function ScheduledTasks() {
  const { tasks, isLoading, error, fetchTasks, createTask, updateTask, deleteTask, toggleTask, runTaskNow } =
    useScheduledTaskStore()
  const { agents } = useChatStore()

  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const [showResults, setShowResults] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    sessionId: '',
    prompt: '',
    scheduleType: 'once' as ScheduleType,
    scheduleValue: '',
    enabled: true,
  })

  useEffect(() => {
    fetchTasks()
    // Refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [fetchTasks])

  const resetForm = () => {
    setFormData({
      name: '',
      agentId: '',
      sessionId: '',
      prompt: '',
      scheduleType: 'once',
      scheduleValue: '',
      enabled: true,
    })
    setEditingTask(null)
  }

  const handleOpenModal = (task?: ScheduledTask) => {
    if (task) {
      setEditingTask(task)
      setFormData({
        name: task.name,
        agentId: task.agentId,
        sessionId: task.sessionId || '',
        prompt: task.prompt,
        scheduleType: task.schedule.type,
        scheduleValue: task.schedule.value,
        enabled: task.enabled,
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const taskData = {
      name: formData.name,
      agentId: formData.agentId,
      agentName: agents.find((a) => a.id === formData.agentId)?.name,
      sessionId: formData.sessionId || undefined,
      prompt: formData.prompt,
      schedule: {
        type: formData.scheduleType,
        value: formData.scheduleValue,
      },
      enabled: formData.enabled,
    }

    if (editingTask) {
      await updateTask(editingTask.id, taskData)
    } else {
      await createTask(taskData)
    }

    handleCloseModal()
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个定时任务吗？')) {
      await deleteTask(id)
    }
  }

  const getStatusIcon = (task: ScheduledTask) => {
    if (!task.enabled) {
      return <Pause className="w-4 h-4 text-gray-400" />
    }
    if (task.nextRun && new Date(task.nextRun) > new Date()) {
      return <Clock className="w-4 h-4 text-blue-500" />
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  const getResultIcon = (result: TaskResult) => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">定时任务</h1>
          <p className="text-gray-500 mt-1">创建和管理自动化任务，让AI智能体按时执行</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchTasks()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            刷新
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Task List */}
      <div className="space-y-4">
        {tasks.length === 0 && !isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无定时任务</h3>
            <p className="text-gray-500 mb-6">创建定时任务，让AI自动按设定时间执行</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg transition-colors"
            >
              创建第一个任务
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Task Header */}
              <div
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
              >
                <div className="flex-shrink-0">{getStatusIcon(task)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{task.name}</h3>
                    {!task.enabled && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">已暂停</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" />
                      {task.agentName || task.agentId}
                    </span>
                    <span>•</span>
                    <span>{scheduleTypeLabels[task.schedule.type]}</span>
                    <span>•</span>
                    <span>
                      {task.enabled
                        ? task.nextRun
                          ? `下次执行: ${formatTime(task.nextRun)}`
                          : '等待中'
                        : '已暂停'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {task.lastRun && (
                    <span className="text-xs text-gray-400">
                      上次执行: {formatTime(task.lastRun)}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTask(task.id, !task.enabled)
                    }}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      task.enabled
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                    title={task.enabled ? '暂停' : '启用'}
                  >
                    {task.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      runTaskNow(task.id)
                    }}
                    className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors"
                    title="立即执行"
                  >
                    <Play className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenModal(task)
                    }}
                    className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(task.id)
                    }}
                    className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {expandedTask === task.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedTask === task.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">提示词</span>
                      <pre className="mt-1 text-sm bg-white p-3 rounded-lg border border-gray-200 overflow-auto max-h-32">
                        {task.prompt}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-500">调度类型</span>
                        <p className="text-sm text-gray-900">{scheduleTypeLabels[task.schedule.type]}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">调度值</span>
                        <p className="text-sm text-gray-900 font-mono">{task.schedule.value}</p>
                      </div>
                      {task.sessionId && (
                        <div>
                          <span className="text-xs text-gray-500">会话ID</span>
                          <p className="text-sm text-gray-900">{task.sessionId}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-500">创建时间</span>
                        <p className="text-sm text-gray-900">{formatTime(task.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Results Section */}
                  <div>
                    <button
                      onClick={() => setShowResults(showResults === task.id ? null : task.id)}
                      className="flex items-center gap-2 text-sm text-accio-600 hover:text-accio-700"
                    >
                      <Calendar className="w-4 h-4" />
                      执行历史 ({task.results?.length || 0})
                      {showResults === task.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showResults === task.id && (
                      <div className="mt-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {task.results?.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">暂无执行记录</div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {[...task.results].reverse().map((result) => (
                              <div key={result.id} className="p-3 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getResultIcon(result)}
                                    <span className="text-sm text-gray-900">{formatTime(result.timestamp)}</span>
                                    {result.duration && (
                                      <span className="text-xs text-gray-500">({formatDuration(result.duration)})</span>
                                    )}
                                  </div>
                                </div>
                                {result.output && (
                                  <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                                    {result.output}
                                  </pre>
                                )}
                                {result.error && (
                                  <pre className="mt-2 text-xs bg-red-50 text-red-700 p-2 rounded overflow-auto max-h-40">
                                    {result.error}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTask ? '编辑定时任务' : '新建定时任务'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">任务名称</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  placeholder="例如：每日市场分析报告"
                />
              </div>

              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">所属智能体</label>
                <select
                  required
                  value={formData.agentId}
                  onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                >
                  <option value="">请选择智能体</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Session ID (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">会话ID (可选)</label>
                <input
                  type="text"
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  placeholder="用于关联特定会话"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">提示词</label>
                <textarea
                  required
                  rows={4}
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500 resize-none"
                  placeholder="输入要执行的提示词..."
                />
              </div>

              {/* Schedule Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">调度类型</label>
                  <select
                    value={formData.scheduleType}
                    onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value as ScheduleType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  >
                    <option value="once">单次执行</option>
                    <option value="daily">每天</option>
                    <option value="interval">间隔</option>
                    <option value="cron">Cron表达式</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">调度值</label>
                  <input
                    type="text"
                    required
                    value={formData.scheduleValue}
                    onChange={(e) => setFormData({ ...formData, scheduleValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                    placeholder={scheduleTypePlaceholders[formData.scheduleType]}
                  />
                </div>
              </div>

              {/* Schedule Help */}
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                <p className="font-medium mb-1">{scheduleTypeLabels[formData.scheduleType]}说明：</p>
                {formData.scheduleType === 'once' && <p>设置一个具体的日期时间，格式：2025-12-31T09:00:00</p>}
                {formData.scheduleType === 'daily' && <p>每天固定时间执行，格式：09:00（24小时制）</p>}
                {formData.scheduleType === 'interval' && <p>每隔多少分钟执行一次，格式：60（表示每小时）</p>}
                {formData.scheduleType === 'cron' && <p>Cron表达式，格式：分 时 日 月 周（如：0 9 * * * 表示每天9点）</p>}
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-4 h-4 text-accio-600 border-gray-300 rounded focus:ring-accio-500"
                />
                <label htmlFor="enabled" className="text-sm text-gray-700">
                  创建后立即启用
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg transition-colors"
                >
                  {editingTask ? '保存修改' : '创建任务'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

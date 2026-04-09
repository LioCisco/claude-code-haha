import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  Terminal,
  AlertCircle,
  RefreshCw,
  Bot,
  Calendar,
  Timer,
} from 'lucide-react'
import { getScheduledTask } from '@/api/scheduledTasks'
import type { ScheduledTask, TaskResult } from '@/types'
import { cn, formatTime } from '@/lib/utils'

export default function TaskExecutionLog() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<ScheduledTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<TaskResult | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const fetchTask = async () => {
    if (!taskId) return
    try {
      const data = await getScheduledTask(taskId)
      setTask(data)
      // 如果没有选中结果，默认选中最新的
      if (!selectedResult && data.results?.length > 0) {
        setSelectedResult(data.results[0])
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTask()
    // 自动刷新
    const interval = setInterval(fetchTask, 3000)
    return () => clearInterval(interval)
  }, [taskId])

  // 自动滚动到日志底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [selectedResult?.output])

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusIcon = (status: TaskResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    }
  }

  const getStatusText = (status: TaskResult['status']) => {
    switch (status) {
      case 'success':
        return '执行成功'
      case 'error':
        return '执行失败'
      case 'running':
        return '执行中'
    }
  }

  const getStatusClass = (status: TaskResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accio-600" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600">{error || '任务不存在'}</p>
        <button
          onClick={() => navigate('/scheduled-tasks')}
          className="mt-4 px-4 py-2 bg-accio-600 text-white rounded-lg"
        >
          返回任务列表
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/scheduled-tasks')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{task.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {task.description || '无描述'} · {task.agentName || task.agentId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTask}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Execution History */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              执行历史
              <span className="text-sm text-gray-500">({task.results?.length || 0})</span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {task.results?.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">暂无执行记录</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {task.results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    className={cn(
                      'w-full p-4 text-left hover:bg-gray-50 transition-colors',
                      selectedResult?.id === result.id && 'bg-blue-50 hover:bg-blue-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            执行 #{task.results.length - index}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              getStatusClass(result.status)
                            )}
                          >
                            {getStatusText(result.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(result.timestamp)}
                        </p>
                        {result.duration !== undefined && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            耗时: {formatDuration(result.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Execution Detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedResult ? (
            <>
              {/* Execution Info Bar */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedResult.status)}
                      <span className="font-medium text-gray-900">
                        {getStatusText(selectedResult.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {formatTime(selectedResult.timestamp)}
                    </div>
                    {selectedResult.duration !== undefined && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Timer className="w-4 h-4" />
                        {formatDuration(selectedResult.duration)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Log Output */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Steps Timeline */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-4">
                    {/* Step 1 */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">任务启动</p>
                        <p className="text-xs text-gray-500">{formatTime(selectedResult.timestamp)}</p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex-1 h-0.5 bg-gray-200" />

                    {/* Step 2 */}
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center',
                          selectedResult.status === 'running'
                            ? 'bg-blue-100 border-2 border-blue-500 animate-pulse'
                            : selectedResult.status === 'success'
                              ? 'bg-green-500'
                              : selectedResult.status === 'error'
                                ? 'bg-red-500'
                                : 'bg-gray-100'
                        )}
                      >
                        {selectedResult.status === 'running' ? (
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        ) : (
                          <Bot
                            className={cn(
                              'w-4 h-4',
                              selectedResult.status === 'success'
                                ? 'text-white'
                                : selectedResult.status === 'error'
                                  ? 'text-white'
                                  : 'text-gray-600'
                            )}
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">AI 处理</p>
                        <p className="text-xs text-gray-500">
                          {selectedResult.status === 'running' ? '处理中...' : '处理完成'}
                        </p>
                      </div>
                    </div>

                    {/* Arrow */}
                    {selectedResult.status !== 'running' && (
                      <>
                        <div className="flex-1 h-0.5 bg-gray-200" />

                        {/* Step 3 */}
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              selectedResult.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                            )}
                          >
                            {selectedResult.status === 'success' ? (
                              <CheckCircle className="w-4 h-4 text-white" />
                            ) : (
                              <XCircle className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedResult.status === 'success' ? '执行完成' : '执行失败'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedResult.duration !== undefined &&
                                `耗时: ${formatDuration(selectedResult.duration)}`}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Raw Log Output */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">执行日志</span>
                  </div>
                  <div
                    ref={logRef}
                    className="flex-1 bg-gray-900 rounded-lg p-4 overflow-auto font-mono text-sm"
                  >
                    {selectedResult.output ? (
                      <pre className="text-green-400 whitespace-pre-wrap">{selectedResult.output}</pre>
                    ) : (
                      <p className="text-gray-500">暂无输出</p>
                    )}
                    {selectedResult.error && (
                      <pre className="text-red-400 whitespace-pre-wrap mt-4 border-t border-gray-700 pt-4">
                        [ERROR] {selectedResult.error}
                      </pre>
                    )}
                    {selectedResult.status === 'running' && (
                      <div className="flex items-center gap-2 mt-4 text-blue-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>执行中...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Terminal className="w-16 h-16 mb-4" />
              <p>选择左侧执行记录查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

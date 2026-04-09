/**
 * 工作流列表页面 - Coze 风格
 * 支持发布流程、版本管理、状态切换
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Play,
  Edit2,
  Trash2,
  FileJson,
  Clock,
  MoreVertical,
  Rocket,
  Copy,
  History,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pause,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  publishWorkflow,
  getPublishHistory,
  exportWorkflow,
  type Workflow,
  type PublishHistory,
} from '@/api/workflows'

export default function WorkflowList() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [publishVersion, setPublishVersion] = useState('')
  const [publishChanges, setPublishChanges] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishHistory, setPublishHistory] = useState<PublishHistory[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'active' | 'disabled'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    setLoading(true)
    try {
      const data = await getWorkflows()
      setWorkflows(data)
    } catch (error) {
      console.error('获取工作流失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPublishHistory = async (workflowId: string) => {
    try {
      const data = await getPublishHistory(workflowId)
      setPublishHistory(data)
    } catch (error) {
      console.error('获取发布历史失败:', error)
      setPublishHistory([])
    }
  }

  const handleCreate = async () => {
    try {
      const data = await createWorkflow({
        name: '未命名工作流',
        description: '',
        nodes: [
          { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: { label: '开始', config: {} } },
          { id: 'end', type: 'end', position: { x: 400, y: 100 }, data: { label: '结束', config: {} } },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end' }],
        variables: [],
      })
      navigate(`/workflow/${data.workflowId}`)
    } catch (error) {
      console.error('创建工作流失败:', error)
      alert('创建工作流失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handlePublish = async () => {
    if (!selectedWorkflow) return
    setIsPublishing(true)
    try {
      await publishWorkflow(selectedWorkflow.id, {
        version: publishVersion || incrementVersion(selectedWorkflow.version),
        changes: publishChanges,
      })
      setShowPublishModal(false)
      setSelectedWorkflow(null)
      setPublishVersion('')
      setPublishChanges('')
      fetchWorkflows()
    } catch (error) {
      console.error('发布失败:', error)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'disabled' : 'active'
    try {
      await updateWorkflow(workflow.id, { status: newStatus })
      fetchWorkflows()
    } catch (error) {
      console.error('状态切换失败:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedWorkflow) return
    try {
      await deleteWorkflow(selectedWorkflow.id)
      setShowDeleteModal(false)
      setSelectedWorkflow(null)
      fetchWorkflows()
    } catch (error) {
      console.error('删除工作流失败:', error)
    }
  }

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const { getWorkflow } = await import('@/api/workflows')
      const detail = await getWorkflow(workflow.id)

      const data = await createWorkflow({
        name: `${workflow.name} (副本)`,
        description: workflow.description,
        nodes: detail.nodes,
        edges: detail.edges,
        variables: detail.variables,
      })
      navigate(`/workflow/${data.workflowId}`)
    } catch (error) {
      console.error('复制工作流失败:', error)
    }
  }

  const handleExport = async (workflow: Workflow) => {
    try {
      const data = await exportWorkflow(workflow.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflow.name}.json`
      a.click()
    } catch (error) {
      console.error('导出工作流失败:', error)
    }
  }

  const incrementVersion = (version: string): string => {
    const parts = version.split('.')
    if (parts.length === 3) {
      const patch = parseInt(parts[2]) + 1
      return `${parts[0]}.${parts[1]}.${patch}`
    }
    return '1.0.0'
  }

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已发布
          </span>
        )
      case 'draft':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            草稿
          </span>
        )
      case 'disabled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
            <Pause className="w-3.5 h-3.5" />
            已停用
          </span>
        )
      default:
        return null
    }
  }

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.status === 'active').length,
    draft: workflows.filter((w) => w.status === 'draft').length,
    disabled: workflows.filter((w) => w.status === 'disabled').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作流管理</h1>
          <p className="text-gray-500 mt-1">创建、发布和管理您的工作流</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建工作流
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '全部工作流', value: stats.total, color: 'bg-blue-500', icon: GitBranch },
          { label: '已发布', value: stats.active, color: 'bg-green-500', icon: CheckCircle2 },
          { label: '草稿', value: stats.draft, color: 'bg-amber-500', icon: AlertCircle },
          { label: '已停用', value: stats.disabled, color: 'bg-gray-500', icon: Pause },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} bg-opacity-10 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: '全部', count: stats.total },
            { id: 'active', label: '已发布', count: stats.active },
            { id: 'draft', label: '草稿', count: stats.draft },
            { id: 'disabled', label: '已停用', count: stats.disabled },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterStatus(filter.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === filter.id
                  ? 'bg-accio-100 text-accio-700 border border-accio-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filter.label}
              <span className="ml-2 text-xs text-gray-400">{filter.count}</span>
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="搜索工作流..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Workflow List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accio-600" />
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
          <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? '没有找到匹配的工作流' : '还没有创建工作流'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? '尝试调整搜索条件' : '创建您第一个工作流，开始自动化之旅'}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreate} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              创建工作流
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工作流
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  版本
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  执行统计
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新时间
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWorkflows.map((workflow) => (
                <tr key={workflow.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-accio-100 rounded-lg flex items-center justify-center mr-4">
                        <GitBranch className="w-5 h-5 text-accio-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{workflow.name}</div>
                        {workflow.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {workflow.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(workflow.status)}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      v{workflow.version}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" />
                        {workflow.executionCount} 次执行
                      </div>
                      {workflow.lastExecutionAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          上次: {new Date(workflow.lastExecutionAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* 编辑 */}
                      <button
                        onClick={() => navigate(`/workflow/${workflow.id}`)}
                        className="p-2 text-gray-500 hover:text-accio-600 hover:bg-accio-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* 发布按钮 - 仅草稿和停用状态显示 */}
                      {(workflow.status === 'draft' || workflow.status === 'disabled') && (
                        <button
                          onClick={() => {
                            setSelectedWorkflow(workflow)
                            setPublishVersion(incrementVersion(workflow.version))
                            setShowPublishModal(true)
                          }}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="发布"
                        >
                          <Rocket className="w-4 h-4" />
                        </button>
                      )}

                      {/* 停用/启用按钮 */}
                      {workflow.status === 'active' && (
                        <button
                          onClick={() => handleToggleStatus(workflow)}
                          className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="停用"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}

                      {/* 更多操作 */}
                      <div className="relative group">
                        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => handleDuplicate(workflow)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            复制工作流
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWorkflow(workflow)
                              fetchPublishHistory(workflow.id)
                              setShowHistoryModal(true)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <History className="w-4 h-4" />
                            发布历史
                          </button>
                          <button
                            onClick={() => handleExport(workflow)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <FileJson className="w-4 h-4" />
                            导出
                          </button>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => {
                              setSelectedWorkflow(workflow)
                              setShowDeleteModal(true)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Rocket className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">发布工作流</h3>
                <p className="text-sm text-gray-500">{selectedWorkflow.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本号</label>
                <input
                  type="text"
                  value={publishVersion}
                  onChange={(e) => setPublishVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">当前版本: v{selectedWorkflow.version}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">更新说明</label>
                <textarea
                  value={publishChanges}
                  onChange={(e) => setPublishChanges(e.target.value)}
                  placeholder="描述本次更新的内容..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  发布后，此工作流将被激活并可以在生产环境中调用。
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPublishModal(false)
                  setSelectedWorkflow(null)
                  setPublishVersion('')
                  setPublishChanges('')
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    确认发布
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish History Modal */}
      {showHistoryModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">发布历史</h3>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedWorkflow(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {publishHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>暂无发布历史</p>
                </div>
              ) : (
                publishHistory.map((history, index) => (
                  <div key={history.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      {index < publishHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 my-2" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          v{history.version}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(history.publishedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{history.changes || '无更新说明'}</p>
                      <p className="text-xs text-gray-400 mt-1">发布者: {history.publishedBy}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">删除工作流</h3>
                <p className="text-sm text-gray-500">此操作不可恢复</p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              确定要删除工作流 <span className="font-semibold text-gray-900">"{selectedWorkflow.name}"</span> 吗？
              所有相关数据将被永久删除。
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedWorkflow(null)
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

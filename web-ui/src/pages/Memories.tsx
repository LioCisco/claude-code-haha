/*
 * 记忆管理页面 - Claude Code 风格的记忆系统
 */

import { useState, useEffect } from 'react'
import {
  Brain,
  Plus,
  Search,
  Edit2,
  Trash2,
  User,
  MessageSquare,
  FolderKanban,
  BookOpen,
  Tag,
  X,
  Save,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  searchMemories,
  type Memory,
  type MemoryType,
} from '@/api/memories'
import { cn } from '@/lib/utils'

const memoryTypes: { type: MemoryType; label: string; icon: typeof User; color: string }[] = [
  { type: 'user', label: '用户信息', icon: User, color: 'bg-blue-500' },
  { type: 'feedback', label: '偏好反馈', icon: MessageSquare, color: 'bg-amber-500' },
  { type: 'project', label: '项目信息', icon: FolderKanban, color: 'bg-green-500' },
  { type: 'reference', label: '参考资源', icon: BookOpen, color: 'bg-purple-500' },
]

export default function Memories() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'user' as MemoryType,
    content: '',
    tags: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetchMemories()
  }, [selectedType])

  const fetchMemories = async () => {
    setLoading(true)
    try {
      const type = selectedType === 'all' ? undefined : selectedType
      const data = await getMemories(type)
      setMemories(data)
    } catch (error) {
      console.error('Failed to fetch memories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMemories()
      return
    }
    setLoading(true)
    try {
      const data = await searchMemories(searchQuery)
      setMemories(data)
    } catch (error) {
      console.error('Failed to search memories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.content.trim()) return

    try {
      if (editingMemory) {
        await updateMemory(editingMemory.id, formData)
      } else {
        await createMemory(formData)
      }
      setShowModal(false)
      setEditingMemory(null)
      setFormData({ name: '', description: '', type: 'user', content: '', tags: [] })
      fetchMemories()
    } catch (error) {
      console.error('Failed to save memory:', error)
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记忆吗？')) return
    try {
      await deleteMemory(id)
      fetchMemories()
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  const handleEdit = (memory: Memory) => {
    setEditingMemory(memory)
    setFormData({
      name: memory.name,
      description: memory.description,
      type: memory.type,
      content: memory.content,
      tags: memory.tags || [],
    })
    setShowModal(true)
  }

  const handleAddTag = () => {
    if (!tagInput.trim()) return
    if (formData.tags.includes(tagInput.trim())) return
    setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) })
  }

  const getTypeConfig = (type: MemoryType) => memoryTypes.find((t) => t.type === type) || memoryTypes[0]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">记忆管理</h1>
              <p className="text-gray-500 mt-1">管理 Claude 对你的了解 - 用户信息、偏好和项目背景</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建记忆
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <button
          onClick={() => setSelectedType('all')}
          className={cn(
            'bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md',
            selectedType === 'all' ? 'border-violet-500 ring-2 ring-violet-200' : 'border-gray-200'
          )}
        >
          <div className="text-3xl font-bold text-gray-900">{memories.length}</div>
          <div className="text-sm text-gray-500">全部记忆</div>
        </button>
        {memoryTypes.map((type) => {
          const count = memories.filter((m) => m.type === type.type).length
          const Icon = type.icon
          return (
            <button
              key={type.type}
              onClick={() => setSelectedType(type.type)}
              className={cn(
                'bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md',
                selectedType === type.type ? 'border-violet-500 ring-2 ring-violet-200' : 'border-gray-200'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', type.color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-500">{type.label}</div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索记忆..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors"
        >
          搜索
        </button>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('')
              fetchMemories()
            }}
            className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full" />
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{searchQuery ? '没有找到匹配的记忆' : '还没有创建记忆'}</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? '尝试调整搜索关键词' : '创建记忆让 Claude 更好地了解你和你的项目'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowModal(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              创建第一条记忆
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {memories.map((memory) => {
            const typeConfig = getTypeConfig(memory.type)
            const Icon = typeConfig.icon
            return (
              <div key={memory.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', typeConfig.color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{memory.name}</h3>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{typeConfig.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{memory.description}</p>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{memory.content}</div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(memory.updatedAt).toLocaleString('zh-CN')}
                        </div>
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" />
                            {memory.tags.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(memory)} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(memory.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{editingMemory ? '编辑记忆' : '新建记忆'}</h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingMemory(null)
                    setFormData({ name: '', description: '', type: 'user', content: '', tags: [] })
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">记忆类型</label>
                <div className="grid grid-cols-4 gap-3">
                  {memoryTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.type })}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                          formData.type === type.type ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', type.color)}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：用户的编程偏好、项目技术栈"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简短描述这条记忆的用途"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="详细描述记忆内容..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="添加标签，按回车确认"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button type="button" onClick={handleAddTag} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="w-4 h-4 flex items-center justify-center hover:bg-violet-200 rounded-full">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  setEditingMemory(null)
                  setFormData({ name: '', description: '', type: 'user', content: '', tags: [] })
                }}
                className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formData.name.trim() || !formData.content.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium"
              >
                <Save className="w-4 h-4" />
                {editingMemory ? '保存修改' : '创建记忆'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

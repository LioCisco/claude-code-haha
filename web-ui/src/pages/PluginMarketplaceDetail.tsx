import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Puzzle,
  Download,
  Star,
  ChevronLeft,
  Check,
  Loader2,
  User,
  Calendar,
  Tag,
  ThumbsUp,
  ThumbsDown,
  GitBranch,
  Code,
  FileText,
  ExternalLink,
  Wrench,
  Globe,
  Zap,
  Brain,
} from 'lucide-react'
import { marketplaceApi, type MarketplacePlugin, type PluginReview } from '../api/marketplace'

const categoryIcons: Record<string, typeof Puzzle> = {
  utility: Wrench,
  integration: Globe,
  automation: Zap,
  ai: Brain,
  dev: Code,
  data: FileText,
}

export default function PluginMarketplaceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plugin, setPlugin] = useState<MarketplacePlugin | null>(null)
  const [reviews, setReviews] = useState<PluginReview[]>([])
  const [loading, setLoading] = useState(true)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [activeTab, setActiveTab] = useState<'readme' | 'tools' | 'reviews'>('readme')
  const [showRatingModal, setShowRatingModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadPlugin()
      loadReviews()
    }
  }, [id])

  const loadPlugin = async () => {
    try {
      setLoading(true)
      const response = await marketplaceApi.getPlugin(id!)
      if (response.success) {
        setPlugin(response.plugin)
        setIsInstalled(response.plugin.isInstalled || false)
      }
    } catch (error) {
      console.error('Failed to load plugin:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      const response = await marketplaceApi.getReviews(id!, 20)
      if (response.success) {
        setReviews(response.reviews)
      }
    } catch (error) {
      console.error('Failed to load reviews:', error)
    }
  }

  const handleInstall = async () => {
    if (isInstalled) return
    setIsInstalling(true)
    try {
      const response = await marketplaceApi.install(id!)
      if (response.success) {
        setIsInstalled(true)
      }
    } catch (error) {
      console.error('Install failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleUninstall = async () => {
    try {
      const response = await marketplaceApi.uninstall(id!)
      if (response.success) {
        setIsInstalled(false)
      }
    } catch (error) {
      console.error('Uninstall failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!plugin) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Puzzle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500">插件不存在</p>
        <button
          onClick={() => navigate('/marketplace')}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <ChevronLeft className="w-4 h-4" />
          返回市场
        </button>
      </div>
    )
  }

  const Icon = categoryIcons[plugin.category] || Puzzle
  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }))
  const totalReviews = reviews.length

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            返回插件市场
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{plugin.name}</h1>
                <p className="text-gray-500 mt-1">
                  {plugin.shortDescription || plugin.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {plugin.authorName || 'Anonymous'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(plugin.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    {plugin.downloadCount} 次下载
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                {isInstalled ? (
                  <button
                    onClick={handleUninstall}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    卸载
                  </button>
                ) : (
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isInstalling ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    {isInstalling ? '安装中...' : '安装'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-gray-900">{plugin.ratingAvg.toFixed(1)}</span>
                <span className="text-gray-500">({plugin.ratingCount} 评价)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {[
            { id: 'readme', label: '介绍', icon: FileText },
            { id: 'tools', label: '工具', icon: Code },
            { id: 'reviews', label: `评价 (${plugin.ratingCount})`, icon: Star },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'readme' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {plugin.readme ? (
                <div className="prose prose-blue max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700">
                    {plugin.readme}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500">暂无详细介绍</p>
              )}
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              {plugin.manifest?.tools?.map((tool: any) => (
                <div
                  key={tool.name}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <Code className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 font-mono">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-gray-500">{tool.description}</p>
                    </div>
                  </div>

                  {tool.input_schema?.properties && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        参数
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {Object.entries(tool.input_schema.properties).map(
                          ([key, value]: [string, any]) => (
                            <div
                              key={key}
                              className="flex items-start gap-2 py-2 border-b border-gray-200 last:border-0"
                            >
                              <code className="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {key}
                              </code>
                              <span className="text-xs text-gray-500">
                                {value.type}
                                {tool.input_schema.required?.includes(key) && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                              </span>
                              {value.description && (
                                <span className="text-sm text-gray-600 ml-auto">
                                  {value.description}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Rating Summary */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">
                      {plugin.ratingAvg.toFixed(1)}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(plugin.ratingAvg)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {plugin.ratingCount} 个评价
                    </p>
                  </div>

                  <div className="flex-1">
                    {ratingCounts.map(({ rating, count }) => (
                      <div key={rating} className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-600 w-8">{rating}星</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full"
                            style={{
                              width: `${totalReviews > 0 ? (count / totalReviews) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    写评价
                  </button>
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {review.displayName || review.username || 'Anonymous'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.review && (
                      <p className="mt-4 text-gray-700">{review.review}</p>
                    )}
                    {review.isRecommended && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                        <ThumbsUp className="w-4 h-4" />
                        推荐
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          pluginId={id!}
          onClose={() => setShowRatingModal(false)}
          onSubmit={() => {
            loadReviews()
            loadPlugin()
            setShowRatingModal(false)
          }}
        />
      )}
    </div>
  )
}

// Rating Modal
function RatingModal({
  pluginId,
  onClose,
  onSubmit,
}: {
  pluginId: string
  onClose: () => void
  onSubmit: () => void
}) {
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [isRecommended, setIsRecommended] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await marketplaceApi.rate(pluginId, {
        rating,
        review,
        isRecommended,
      })
      if (response.success) {
        onSubmit()
      }
    } catch (error) {
      console.error('Failed to submit rating:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">评价插件</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="sr-only">关闭</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评分
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              评价内容（可选）
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="分享你的使用体验..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recommend"
              checked={isRecommended}
              onChange={(e) => setIsRecommended(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="recommend" className="text-sm text-gray-700">
              推荐这个插件
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '提交中...' : '提交评价'}
          </button>
        </div>
      </div>
    </div>
  )
}

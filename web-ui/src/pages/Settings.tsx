import { useState, useEffect } from 'react'
import {
  User,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Key,
  Users,
  ChevronRight,
  Save,
  Check,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import { useSettingsStore } from '@/store/useSettingsStore'
import type { NotificationSettings } from '@/types'
import { cn } from '@/lib/utils'

const settingsSections = [
  { id: 'account', name: '账户设置', icon: User },
  { id: 'notifications', name: '通知偏好', icon: Bell },
  { id: 'security', name: '安全与隐私', icon: Shield },
  { id: 'integrations', name: '平台集成', icon: Globe },
  { id: 'billing', name: '计费与订阅', icon: CreditCard },
  { id: 'team', name: '团队成员', icon: Users },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState('account')
  const { fetchSettings, fetchIntegrations, fetchTeamMembers, isLoading, error, clearError } = useSettingsStore()

  useEffect(() => {
    fetchSettings()
    fetchIntegrations()
    fetchTeamMembers()
  }, [fetchSettings, fetchIntegrations, fetchTeamMembers])

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">设置</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={clearError} className="ml-auto text-sm underline">关闭</button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                activeSection === section.id
                  ? 'bg-accio-50 text-accio-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span className="font-medium">{section.name}</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6">
          {isLoading && !error ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-accio-600" />
            </div>
          ) : (
            <>
              {activeSection === 'account' && <AccountSettings />}
              {activeSection === 'notifications' && <NotificationSettings />}
              {activeSection === 'security' && <SecuritySettings />}
              {activeSection === 'integrations' && <IntegrationSettings />}
              {activeSection === 'billing' && <BillingSettings />}
              {activeSection === 'team' && <TeamSettings />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AccountSettings() {
  const { settings, updateSettings, isLoading } = useSettingsStore()
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    region: '中国大陆',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        displayName: settings.displayName || '',
        email: settings.email || '',
        phone: settings.phone || '',
        region: settings.region || '中国大陆',
      })
    }
  }, [settings])

  const handleSave = async () => {
    await updateSettings(formData)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">账户信息</h2>
        <p className="text-sm text-gray-500">管理您的个人资料信息</p>
      </div>

      <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
        <div className="w-20 h-20 bg-gradient-to-br from-accio-400 to-accio-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {formData.displayName?.[0] || '商'}
        </div>
        <div>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors">
            更换头像
          </button>
          <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG 格式，最大 2MB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">所在地区</label>
          <select
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
          >
            <option>中国大陆</option>
            <option>中国香港</option>
            <option>美国</option>
            <option>新加坡</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg disabled:opacity-50"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          保存更改
        </button>
      </div>
    </div>
  )
}

function NotificationSettings() {
  const { settings, updateNotifications, isLoading } = useSettingsStore()
  const [localSettings, setLocalSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  })

  useEffect(() => {
    if (settings?.notifications) {
      setLocalSettings(settings.notifications)
    }
  }, [settings])

  const handleToggle = async (key: keyof NotificationSettings) => {
    const updated = { ...localSettings, [key]: !localSettings[key] }
    setLocalSettings(updated)
    await updateNotifications(updated)
  }

  const items = [
    { key: 'email', label: '邮件通知', description: '接收订单、系统更新等邮件通知' },
    { key: 'push', label: '推送通知', description: '在浏览器或App中接收实时推送' },
    { key: 'sms', label: '短信通知', description: '重要事件通过短信通知' },
    { key: 'marketing', label: '营销邮件', description: '接收产品更新、优惠活动等信息' },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">通知偏好</h2>
        <p className="text-sm text-gray-500">选择您希望接收的通知类型</p>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings[item.key]}
                onChange={() => handleToggle(item.key)}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accio-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecuritySettings() {
  const { settings } = useSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">安全与隐私</h2>
        <p className="text-sm text-gray-500">管理账户安全和数据隐私设置</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">双重验证 (2FA)</p>
                <p className="text-sm text-gray-500">
                  {settings?.security?.twoFactorEnabled ? '已启用' : '未启用'}
                </p>
              </div>
            </div>
            <button className="text-sm text-accio-600 hover:text-accio-700">管理</button>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">API 密钥</p>
                <p className="text-sm text-gray-500">管理API访问密钥</p>
              </div>
            </div>
            <button className="text-sm text-accio-600 hover:text-accio-700">查看</button>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">登录历史</p>
                <p className="text-sm text-gray-500">查看最近登录活动</p>
              </div>
            </div>
            <button className="text-sm text-accio-600 hover:text-accio-700">查看</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IntegrationSettings() {
  const { integrations, toggleIntegration, isLoading } = useSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">平台集成</h2>
        <p className="text-sm text-gray-500">连接您的电商平台账号</p>
      </div>

      <div className="space-y-4">
        {integrations.map((platform) => (
          <div key={platform.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{platform.icon}</span>
              <div>
                <p className="font-medium text-gray-900">{platform.platformName}</p>
                <p className="text-sm text-gray-500">
                  {platform.isConnected
                    ? `已连接${platform.storeName ? ` · ${platform.storeName}` : ''}`
                    : '未连接'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleIntegration(platform.platform, !platform.isConnected)}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                platform.isConnected
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-accio-600 text-white hover:bg-accio-700'
              )}
            >
              {platform.isConnected ? '已连接' : '连接'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function BillingSettings() {
  const { settings } = useSettingsStore()
  const subscription = settings?.subscription

  const planNames: Record<string, string> = {
    free: 'Free Plan',
    pro: 'Pro Plan',
    enterprise: 'Enterprise',
  }

  const tokensUsed = subscription?.tokensUsed || 0
  const tokensLimit = subscription?.tokensLimit || 50000
  const usagePercent = Math.min((tokensUsed / tokensLimit) * 100, 100)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">计费与订阅</h2>
        <p className="text-sm text-gray-500">管理您的订阅计划和支付方式</p>
      </div>

      <div className="bg-gradient-to-r from-accio-500 to-accio-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-accio-100 text-sm">当前方案</p>
            <p className="text-2xl font-bold">{planNames[subscription?.plan || 'pro']}</p>
            <p className="text-sm text-accio-100 mt-1">
              每月 ${subscription?.plan === 'pro' ? '29' : '0'}，包含 {tokensLimit.toLocaleString()} Token
            </p>
          </div>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
            升级方案
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Token 使用</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">本月已使用</span>
            <span className="font-medium text-gray-900">
              {tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-accio-500 rounded-full transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">将在 12 天后重置</p>
        </div>
      </div>
    </div>
  )
}

function TeamSettings() {
  const { teamMembers, removeTeamMember, isLoading, addTeamMember } = useSettingsStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'member' as const })

  const handleAdd = async () => {
    if (!newMember.name || !newMember.email) return
    await addTeamMember({
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      avatar: newMember.name[0],
    })
    setShowAddModal(false)
    setNewMember({ name: '', email: '', role: 'member' })
  }

  const handleRemove = async (id: string) => {
    if (confirm('确定要移除该成员吗？')) {
      await removeTeamMember(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">团队成员</h2>
          <p className="text-sm text-gray-500">管理可以访问您账户的团队成员</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          邀请成员
        </button>
      </div>

      <div className="space-y-3">
        {teamMembers.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                {member.avatar || member.name[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                'text-xs px-2 py-1 rounded-full',
                member.role === 'owner' && 'bg-purple-100 text-purple-700',
                member.role === 'admin' && 'bg-blue-100 text-blue-700',
                member.role === 'member' && 'bg-gray-100 text-gray-700'
              )}>
                {member.role === 'owner' ? '所有者' : member.role === 'admin' ? '管理员' : '成员'}
              </span>
              {member.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(member.id)}
                  disabled={isLoading}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">邀请新成员</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  placeholder="输入成员姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                  placeholder="输入邮箱地址"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value as 'admin' | 'member' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accio-500"
                >
                  <option value="admin">管理员</option>
                  <option value="member">成员</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={!newMember.name || !newMember.email || isLoading}
                className="px-4 py-2 bg-accio-600 hover:bg-accio-700 text-white rounded-lg disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                邀请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

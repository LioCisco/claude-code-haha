import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import {
  Mail,
  Lock,
  User,
  Building2,
  Smartphone,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 科技风几何背景组件
const TechBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-900 via-accio-900 to-slate-900">
      {/* 网格背景 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* 浮动几何形状 */}
      <div className="absolute inset-0">
        {/* 大圆形 */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-accio-400/30 animate-pulse"
          style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full border border-accio-300/20 animate-pulse"
          style={{ animationDuration: '6s', animationDelay: '1s' }} />

        {/* 六边形 */}
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 animate-float"
          style={{
            animationDuration: '8s',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          }}>
          <div className="w-full h-full bg-gradient-to-br from-accio-500/20 to-emerald-500/20 backdrop-blur-sm border border-accio-400/30" />
        </div>

        {/* 小六边形 */}
        <div className="absolute top-1/2 right-1/3 w-16 h-16 animate-float"
          style={{
            animationDuration: '6s',
            animationDelay: '2s',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          }}>
          <div className="w-full h-full bg-gradient-to-br from-accio-300/30 to-accio-500/30" />
        </div>

        {/* 浮动方块 */}
        <div className="absolute top-1/3 right-1/4 w-24 h-24 border border-accio-300/20 rotate-45 animate-spin"
          style={{ animationDuration: '20s' }} />

        <div className="absolute bottom-1/3 left-1/3 w-16 h-16 border border-accio-400/20 rotate-12 animate-float"
          style={{ animationDuration: '7s' }} />

        {/* 连接线 */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(34, 197, 94, 0)" />
              <stop offset="50%" stopColor="rgba(34, 197, 94, 0.3)" />
              <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
            </linearGradient>
          </defs>
          <line x1="25%" y1="25%" x2="75%" y2="75%" stroke="url(#lineGradient)" strokeWidth="1" />
          <line x1="75%" y1="25%" x2="25%" y2="75%" stroke="url(#lineGradient)" strokeWidth="1" />
        </svg>

        {/* 光点 */}
        <div className="absolute top-1/4 right-1/3 w-2 h-2 bg-accio-300 rounded-full animate-ping"
          style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-accio-400 rounded-full animate-ping"
          style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-accio-300 rounded-full animate-ping"
          style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
      </div>

      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/5" />
    </div>
  )
}

// Logo 组件
const Logo = () => (
  <div className="flex items-center gap-3 mb-8">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accio-500 to-accio-600 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white rounded-lg transform rotate-45" />
    </div>
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Kane Work</h1>
      <p className="text-sm text-slate-500">AI 跨境电商智能体</p>
    </div>
  </div>
)

// 输入框组件
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode
  label: string
  error?: string
}

const Input = ({ icon, label, error, className, ...props }: InputProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = props.type === 'password'

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </div>
        <input
          className={cn(
            "w-full pl-10 pr-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm",
            "focus:outline-none focus:ring-2 focus:ring-accio-500/20 focus:border-accio-500",
            "transition-all duration-200",
            error ? "border-red-300 focus:border-red-500" : "border-slate-200",
            isPassword && "pr-10",
            className
          )}
          {...props}
          type={isPassword && showPassword ? 'text' : props.type}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// 验证码输入组件
const VerificationCodeInput = ({
  value,
  onChange,
  onSendCode,
  loading
}: {
  value: string
  onChange: (value: string) => void
  onSendCode: () => void
  loading: boolean
}) => {
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleSendCode = () => {
    if (countdown === 0) {
      onSendCode()
      setCountdown(60)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">验证码</label>
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入验证码"
          className={cn(
            "flex-1 px-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm",
            "focus:outline-none focus:ring-2 focus:ring-accio-500/20 focus:border-accio-500",
            "transition-all duration-200",
            "border-slate-200"
          )}
        />
        <button
          type="button"
          onClick={handleSendCode}
          disabled={countdown > 0 || loading}
          className={cn(
            "px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap",
            "transition-all duration-200",
            countdown > 0
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-accio-500 to-accio-600 text-white hover:from-accio-600 hover:to-accio-700"
          )}
        >
          {countdown > 0 ? `${countdown}s` : '获取验证码'}
        </button>
      </div>
    </div>
  )
}

// 登录表单
const LoginForm = ({ onSwitchMode }: { onSwitchMode: (mode: 'login' | 'register') => void }) => {
  const [loginType, setLoginType] = useState<'password' | 'code'>('code')
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    code: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = loginType === 'code' ? '/api/auth/login/phone' : '/api/auth/login'
      const body = loginType === 'code'
        ? { phone: formData.phone, code: formData.code }
        : { username: formData.phone, password: formData.password }

      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        login(data.data.user, data.data.token)
        navigate('/')
      } else {
        setError(data.message || '登录失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!formData.phone) {
      setError('请输入手机号')
      return
    }
    // 发送验证码逻辑
    try {
      const response = await fetch('http://localhost:8080/api/auth/send-phone-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, type: 'login' })
      })
      const data = await response.json()
      if (!data.success) {
        setError(data.message || '发送验证码失败')
      }
    } catch {
      setError('发送验证码失败')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 登录方式切换 */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setLoginType('code')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
            loginType === 'code'
              ? "bg-white text-accio-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          验证码登录
        </button>
        <button
          type="button"
          onClick={() => setLoginType('password')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
            loginType === 'password'
              ? "bg-white text-accio-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          密码登录
        </button>
      </div>

      <Input
        icon={<Smartphone className="w-5 h-5" />}
        label="手机号"
        type="tel"
        placeholder="请输入手机号"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      />

      {loginType === 'code' ? (
        <VerificationCodeInput
          value={formData.code}
          onChange={(code) => setFormData({ ...formData, code })}
          onSendCode={handleSendCode}
          loading={loading}
        />
      ) : (
        <Input
          icon={<Lock className="w-5 h-5" />}
          label="密码"
          type="password"
          placeholder="请输入密码"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full py-4 rounded-xl font-semibold text-white",
          "bg-gradient-to-r from-accio-500 to-accio-600",
          "hover:from-accio-600 hover:to-accio-700",
          "focus:outline-none focus:ring-4 focus:ring-accio-500/20",
          "transition-all duration-200 flex items-center justify-center gap-2",
          loading && "opacity-70 cursor-not-allowed"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            登录中...
          </>
        ) : (
          <>
            登录
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-slate-500">
        还没有账号？
        <button
          type="button"
          onClick={() => onSwitchMode('register')}
          className="ml-1 text-accio-600 hover:text-accio-700 font-medium"
        >
          立即注册
        </button>
      </p>
    </form>
  )
}

// 注册表单
const RegisterForm = ({ onSwitchMode }: { onSwitchMode: (mode: 'login' | 'register') => void }) => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    name: '',
    company: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateStep1 = () => {
    if (!formData.phone) return '请输入手机号'
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) return '手机号格式不正确'
    if (!formData.code) return '请输入验证码'
    return ''
  }

  const validateStep2 = () => {
    if (!formData.name) return '请输入姓名或公司名'
    if (!formData.password) return '请输入密码'
    if (formData.password.length < 6) return '密码长度至少6位'
    if (formData.password !== formData.confirmPassword) return '两次密码不一致'
    return ''
  }

  const handleNext = () => {
    const err = validateStep1()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateStep2()
    if (err) {
      setError(err)
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8080/api/auth/register/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          code: formData.code,
          name: formData.name,
          company: formData.company,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => onSwitchMode('login'), 2000)
      } else {
        setError(data.message || '注册失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!formData.phone) {
      setError('请输入手机号')
      return
    }
    try {
      const response = await fetch('http://localhost:8080/api/auth/send-phone-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, type: 'register' })
      })
      const data = await response.json()
      if (!data.success) {
        setError(data.message || '发送验证码失败')
      }
    } catch {
      setError('发送验证码失败')
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">注册成功</h3>
        <p className="text-slate-500">即将跳转到登录页面...</p>
      </div>
    )
  }

  return (
    <form onSubmit={step === 1 ? (e => { e.preventDefault(); handleNext() }) : handleSubmit} className="space-y-5">
      {/* 步骤指示器 */}
      <div className="flex items-center gap-4 mb-6">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          step >= 1 ? "bg-gradient-to-r from-accio-500 to-accio-600 text-white" : "bg-slate-200 text-slate-500"
        )}>
          1
        </div>
        <div className="flex-1 h-0.5 bg-slate-200">
          <div className={cn(
            "h-full bg-gradient-to-r from-accio-500 to-accio-600 transition-all",
            step >= 2 ? "w-full" : "w-0"
          )} />
        </div>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          step >= 2 ? "bg-gradient-to-r from-accio-500 to-accio-600 text-white" : "bg-slate-200 text-slate-500"
        )}>
          2
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {step === 1 ? (
        <>
          <Input
            icon={<Smartphone className="w-5 h-5" />}
            label="手机号"
            type="tel"
            placeholder="请输入手机号"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <VerificationCodeInput
            value={formData.code}
            onChange={(code) => setFormData({ ...formData, code })}
            onSendCode={handleSendCode}
            loading={loading}
          />

          <button
            type="submit"
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-white",
              "bg-gradient-to-r from-accio-500 to-accio-600",
              "hover:from-accio-600 hover:to-accio-700",
              "focus:outline-none focus:ring-4 focus:ring-accio-500/20",
              "transition-all duration-200 flex items-center justify-center gap-2"
            )}
          >
            下一步
            <ArrowRight className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <Input
              icon={<User className="w-5 h-5" />}
              label="姓名 / 公司名"
              type="text"
              placeholder="请输入姓名或公司名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Input
              icon={<Building2 className="w-5 h-5" />}
              label="公司名称（选填）"
              type="text"
              placeholder="如需使用公司名注册，请填写"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />

            <Input
              icon={<Lock className="w-5 h-5" />}
              label="密码"
              type="password"
              placeholder="请设置密码（至少6位）"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />

            <Input
              icon={<Lock className="w-5 h-5" />}
              label="确认密码"
              type="password"
              placeholder="请再次输入密码"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              上一步
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "flex-1 py-4 rounded-xl font-semibold text-white",
                "bg-gradient-to-r from-accio-500 to-accio-600",
                "hover:from-accio-600 hover:to-accio-700",
                "focus:outline-none focus:ring-4 focus:ring-accio-500/20",
                "transition-all duration-200 flex items-center justify-center gap-2",
                loading && "opacity-70 cursor-not-allowed"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  注册中...
                </>
              ) : (
                '完成注册'
              )}
            </button>
          </div>
        </>
      )}

      <p className="text-center text-sm text-slate-500">
        已有账号？
        <button
          type="button"
          onClick={() => onSwitchMode('login')}
          className="ml-1 text-accio-600 hover:text-accio-700 font-medium"
        >
          立即登录
        </button>
      </p>
    </form>
  )
}

// 主登录页面
const Login: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  return (
    <div className="min-h-screen flex">
      {/* 左侧 - 科技风背景 */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <TechBackground />

        {/* 左侧内容 */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accio-500/30 to-accio-600/30 backdrop-blur-sm flex items-center justify-center border border-accio-400/30">
                <div className="w-5 h-5 border-2 border-white rounded transform rotate-45" />
              </div>
              <span className="text-xl font-bold">Kane Work</span>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              AI 驱动的<br />
              跨境电商解决方案
            </h2>
            <p className="text-lg text-white/70 max-w-md">
              智能选品、自动运营、数据分析，让 AI 成为您的跨境电商助手
            </p>

            {/* 特性列表 */}
            <div className="space-y-4 mt-8">
              {[
                'AI 智能选品与趋势分析',
                '自动化社媒内容发布',
                '多平台店铺统一管理',
                '智能客服与订单处理'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-accio-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-accio-300" />
                  </div>
                  <span className="text-white/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-white/50">
            © 2025 Kane Work. All rights reserved.
          </div>
        </div>
      </div>

      {/* 右侧 - 表单区域 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-accio-50/30">
        <div className="w-full max-w-md">
          <Logo />

          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-slate-500 mb-6">
              {mode === 'login'
                ? '使用手机号快速登录您的账号'
                : '填写信息完成注册，开启 AI 电商之旅'}
            </p>

            {mode === 'login' ? (
              <LoginForm onSwitchMode={setMode} />
            ) : (
              <RegisterForm onSwitchMode={setMode} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

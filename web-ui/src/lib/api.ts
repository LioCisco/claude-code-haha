/**
 * 统一 API 请求工具
 * 自动添加认证头
 */

import { useAuthStore } from '@/store/useAuthStore'

interface ApiOptions extends RequestInit {
  params?: Record<string, string>
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 获取 token
function getToken(): string | null {
  // 从 localStorage 读取（zustand persist 存储的位置）
  try {
    const stored = localStorage.getItem('accio-auth-store')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    }
  } catch {
    // ignore
  }
  return null
}

// 统一请求函数
export async function api<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options

  // 构建 URL
  let url = endpoint.startsWith('http') ? endpoint : endpoint
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += (url.includes('?') ? '&' : '?') + searchParams.toString()
  }

  // 获取 token 并添加认证头
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((fetchOptions.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      data?.message || `Request failed: ${response.status}`,
      response.status,
      data
    )
  }

  return data as T
}

// HTTP 方法快捷方式
export const apiClient = {
  get: <T = any>(endpoint: string, options?: ApiOptions) =>
    api<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    api<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    api<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: ApiOptions) =>
    api<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T = any>(endpoint: string, body?: any, options?: ApiOptions) =>
    api<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
}

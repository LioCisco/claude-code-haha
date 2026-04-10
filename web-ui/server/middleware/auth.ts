import { Elysia } from 'elysia'
import { verifyToken } from '../lib/jwt'
import { queryOne } from '../db'
import type { LocalUser, JWTPayload } from '../types'

// 扩展Elysia上下文类型
declare module 'elysia' {
  interface Context {
    user?: LocalUser
  }
}

// 认证中间件
export const authMiddleware = new Elysia()
  .onBeforeHandle(async ({ request, set, headers }) => {
    // 跳过 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return
    }

    // 跳过某些公开路由的认证
    const publicPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/login/phone',
      '/api/auth/register/phone',
      '/api/auth/send-phone-code',
      '/api/health',
      '/swagger',
      '/swagger/json',
    ]

    const url = new URL(request.url)
    if (publicPaths.some(path => url.pathname.startsWith(path))) {
      return
    }

    // 获取Authorization header
    const authHeader = headers.authorization
    console.log('[Auth Middleware] Auth header:', authHeader?.slice(0, 30))
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Auth Middleware] No valid auth header')
      set.status = 401
      return {
        success: false,
        message: '未提供认证令牌',
        error: 'Unauthorized'
      }
    }

    const token = authHeader.substring(7)
    console.log('[Auth Middleware] Token extracted:', token.slice(0, 20) + '...')

    try {
      // 验证Token
      const payload = verifyToken(token)
      console.log('[Auth Middleware] Token verified, userId:', payload.userId)

      // 查询用户
      const user = await queryOne<LocalUser>(
        'SELECT * FROM local_users WHERE id = ?',
        [payload.userId]
      )
      console.log('[Auth Middleware] User query result:', user?.id || 'not found')

      if (!user) {
        console.log('[Auth Middleware] User not found for id:', payload.userId)
        set.status = 401
        return {
          success: false,
          message: '用户不存在',
          error: 'Unauthorized'
        }
      }

      // 将用户信息附加到上下文
      // @ts-ignore
      request.user = user
      console.log('[Auth Middleware] User attached to request:', user.id)
    } catch {
      set.status = 401
      return {
        success: false,
        message: '无效的认证令牌',
        error: 'Unauthorized'
      }
    }
  })

// 可选认证中间件（不强制要求登录）
export const optionalAuthMiddleware = new Elysia()
  .onBeforeHandle(async ({ request }) => {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return
    }

    const token = authHeader.substring(7)

    try {
      const payload = verifyToken(token)
      const user = await queryOne<LocalUser>(
        'SELECT * FROM local_users WHERE id = ?',
        [payload.userId]
      )

      if (user) {
        // @ts-ignore
        request.user = user
      }
    } catch {
      // 忽略验证错误，继续处理
    }
  })

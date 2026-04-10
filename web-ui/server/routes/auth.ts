import { Elysia, t } from 'elysia'
import { v4 as uuidv4 } from 'uuid'
import * as bcrypt from 'bcryptjs'
import { query, queryOne, execute } from '../db'
import { generateToken } from '../lib/jwt'
import type { LocalUser, ApiResponse, CreateLocalUserRequest, LoginRequest } from '../types'

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'kane-work-secret-key-local'

// 生成随机验证码
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 模拟发送邮件（实际项目中需要使用真实的邮件服务）
const sendEmail = async (email: string, code: string): Promise<void> => {
  console.log(`发送验证码 ${code} 到邮箱 ${email}`)
  // 这里应该集成真实的邮件发送服务
}

// 模拟发送短信（实际项目中需要使用真实的短信服务）
const sendSMS = async (phone: string, code: string): Promise<void> => {
  console.log(`发送验证码 ${code} 到手机 ${phone}`)
  // 这里应该集成真实的短信发送服务，如阿里云短信、腾讯云短信等
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  // 获取当前登录用户
  .get('/me', async ({ headers, set }): Promise<ApiResponse> => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return {
        success: false,
        message: '未登录',
        error: 'Unauthorized'
      }
    }

    const token = authHeader.substring(7)
    try {
      const { verifyToken } = await import('../lib/jwt')
      const payload = verifyToken(token)
      const user = await queryOne<LocalUser>(
        'SELECT * FROM local_users WHERE id = ?',
        [payload.userId]
      )

      if (!user) {
        set.status = 401
        return {
          success: false,
          message: '用户不存在',
          error: 'Unauthorized'
        }
      }

      const { password_hash, ...userWithoutPassword } = user
      return {
        success: true,
        message: '获取用户信息成功',
        data: { user: userWithoutPassword }
      }
    } catch (error) {
      set.status = 401
      return {
        success: false,
        message: '无效的令牌',
        error: 'Unauthorized'
      }
    }
  })

  // 发送邮箱验证码
  .post('/send-verification-code', async ({ body }): Promise<ApiResponse> => {
    const { email } = body as { email: string }

    // 检查邮箱是否已被注册
    const existingUser = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE email = ?',
      [email]
    )

    if (existingUser) {
      return {
        success: false,
        message: '该邮箱已被注册',
        error: 'EmailExists'
      }
    }

    // 生成验证码
    const code = generateVerificationCode()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10分钟过期

    // 保存验证码到数据库
    await execute(
      `INSERT INTO verification_codes (id, email, code, type, expires_at, is_used)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), email, code, 'register', expiresAt, false]
    )

    // 发送邮件
    await sendEmail(email, code)

    return {
      success: true,
      message: '验证码已发送到您的邮箱'
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' })
    })
  })

  // 发送手机验证码
  .post('/send-phone-code', async ({ body }): Promise<ApiResponse> => {
    const { phone, type = 'register' } = body as { phone: string; type?: 'register' | 'login' }

    // 验证手机号格式（中国大陆手机号）
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return {
        success: false,
        message: '请输入有效的手机号',
        error: 'InvalidPhone'
      }
    }

    // 根据类型检查手机号状态
    const existingUser = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE phone = ?',
      [phone]
    )

    if (type === 'register' && existingUser) {
      return {
        success: false,
        message: '该手机号已被注册',
        error: 'PhoneExists'
      }
    }

    if (type === 'login' && !existingUser) {
      return {
        success: false,
        message: '该手机号未注册，请先注册',
        error: 'PhoneNotFound'
      }
    }

    // 生成验证码
    const code = generateVerificationCode()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10分钟过期

    // 保存验证码到数据库
    await execute(
      `INSERT INTO verification_codes (id, phone, code, type, expires_at, is_used)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), phone, code, type === 'login' ? 'phone_login' : 'register', expiresAt, false]
    )

    // 发送短信
    await sendSMS(phone, code)

    return {
      success: true,
      message: '验证码已发送到您的手机'
    }
  }, {
    body: t.Object({
      phone: t.String(),
      type: t.Optional(t.Union([t.Literal('register'), t.Literal('login')]))
    })
  })

  // 用户登录（本地简单登录）
  .post('/login', async ({ body }): Promise<ApiResponse> => {
    const { username, password } = body as LoginRequest

    // 查询用户（支持用户名或手机号登录）
    let user = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE username = ?',
      [username]
    )

    // 如果没找到，尝试用手机号查询
    if (!user) {
      user = await queryOne<LocalUser>(
        'SELECT * FROM local_users WHERE phone = ?',
        [username]
      )
    }

    if (!user) {
      return {
        success: false,
        message: '用户名或密码错误',
        error: 'InvalidCredentials'
      }
    }

    // 验证密码（如果有设置密码）
    if (user.password_hash) {
      if (!password) {
        return {
          success: false,
          message: '需要密码',
          error: 'PasswordRequired'
        }
      }
      const isValid = await bcrypt.compare(password, user.password_hash)
      if (!isValid) {
        return {
          success: false,
          message: '用户名或密码错误',
          error: 'InvalidCredentials'
        }
      }
    }

    // 更新最后登录时间
    await execute(
      'UPDATE local_users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    )

    // 生成JWT
    const token = generateToken({
      userId: user.id,
      username: user.username
    })

    const { password_hash, ...userWithoutPassword } = user

    return {
      success: true,
      message: '登录成功',
      data: {
        user: {
          ...userWithoutPassword,
          display_name: user.display_name,
          company_name: user.company_name,
        },
        token
      }
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.Optional(t.String())
    })
  })

  // 手机号验证码登录
  .post('/login/phone', async ({ body }): Promise<ApiResponse> => {
    const { phone, code } = body as { phone: string; code: string }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return {
        success: false,
        message: '请输入有效的手机号',
        error: 'InvalidPhone'
      }
    }

    // 查询用户
    const user = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE phone = ?',
      [phone]
    )

    if (!user) {
      return {
        success: false,
        message: '该手机号未注册，请先注册',
        error: 'PhoneNotFound'
      }
    }

    // 验证验证码
    const verificationCodeRecord = await queryOne(
      'SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND type = ? AND is_used = false AND expires_at > NOW()',
      [phone, code, 'phone_login']
    )

    if (!verificationCodeRecord) {
      return {
        success: false,
        message: '验证码错误或已过期',
        error: 'InvalidVerificationCode'
      }
    }

    // 标记验证码为已使用
    await execute(
      'UPDATE verification_codes SET is_used = true WHERE id = ?',
      [verificationCodeRecord.id]
    )

    // 更新最后登录时间
    await execute(
      'UPDATE local_users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    )

    // 生成JWT
    const token = generateToken({
      userId: user.id,
      username: user.username,
      phone: user.phone
    })

    const { password_hash, ...userWithoutPassword } = user

    return {
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token
      }
    }
  }, {
    body: t.Object({
      phone: t.String(),
      code: t.String()
    })
  })

  // 创建本地用户（注册）
  .post('/register', async ({ body }): Promise<ApiResponse> => {
    const { username, email, password, verificationCode } = body as CreateLocalUserRequest & { email: string; verificationCode: string }

    // 检查用户名是否已存在
    const existingUserByUsername = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE username = ?',
      [username]
    )

    if (existingUserByUsername) {
      return {
        success: false,
        message: '用户名已存在',
        error: 'UsernameExists'
      }
    }

    // 检查邮箱是否已被注册
    const existingUserByEmail = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE email = ?',
      [email]
    )

    if (existingUserByEmail) {
      return {
        success: false,
        message: '邮箱已被注册',
        error: 'EmailExists'
      }
    }

    // 验证验证码
    const verificationCodeRecord = await queryOne(
      'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ? AND is_used = false AND expires_at > NOW()',
      [email, verificationCode, 'register']
    )

    if (!verificationCodeRecord) {
      return {
        success: false,
        message: '无效的验证码',
        error: 'InvalidVerificationCode'
      }
    }

    // 标记验证码为已使用
    await execute(
      'UPDATE verification_codes SET is_used = true WHERE id = ?',
      [verificationCodeRecord.id]
    )

    // 创建用户
    const userId = uuidv4()
    let passwordHash: string | null = null

    if (password) {
      passwordHash = await bcrypt.hash(password, 10)
    }

    await execute(
      `INSERT INTO local_users (id, username, email, password_hash, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, username, email, passwordHash, false]
    )

    // 生成JWT
    const token = generateToken({
      userId,
      username
    })

    const newUser = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE id = ?',
      [userId]
    )

    if (!newUser) {
      return {
        success: false,
        message: '创建用户失败',
        error: 'CreateFailed'
      }
    }

    const { password_hash, ...userWithoutPassword } = newUser

    return {
      success: true,
      message: '创建用户成功',
      data: {
        user: userWithoutPassword,
        token
      }
    }
  }, {
    body: t.Object({
      username: t.String(),
      email: t.String({ format: 'email' }),
      password: t.Optional(t.String()),
      verificationCode: t.String()
    })
  })

  // 手机号注册
  .post('/register/phone', async ({ body }): Promise<ApiResponse> => {
    const { phone, code, name, company, password, confirmPassword } = body as {
      phone: string
      code: string
      name: string
      company?: string
      password: string
      confirmPassword: string
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return {
        success: false,
        message: '请输入有效的手机号',
        error: 'InvalidPhone'
      }
    }

    // 检查密码是否一致
    if (password !== confirmPassword) {
      return {
        success: false,
        message: '两次输入的密码不一致',
        error: 'PasswordMismatch'
      }
    }

    // 检查密码长度
    if (password.length < 6) {
      return {
        success: false,
        message: '密码长度至少为6位',
        error: 'PasswordTooShort'
      }
    }

    // 检查手机号是否已被注册
    const existingUser = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE phone = ?',
      [phone]
    )

    if (existingUser) {
      return {
        success: false,
        message: '该手机号已被注册',
        error: 'PhoneExists'
      }
    }

    // 验证验证码
    const verificationCodeRecord = await queryOne(
      'SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND type = ? AND is_used = false AND expires_at > NOW()',
      [phone, code, 'register']
    )

    if (!verificationCodeRecord) {
      return {
        success: false,
        message: '验证码错误或已过期',
        error: 'InvalidVerificationCode'
      }
    }

    // 标记验证码为已使用
    await execute(
      'UPDATE verification_codes SET is_used = true WHERE id = ?',
      [verificationCodeRecord.id]
    )

    // 创建用户
    const userId = uuidv4()
    const username = `user_${phone.slice(-4)}_${Date.now().toString(36)}`
    const passwordHash = await bcrypt.hash(password, 10)

    await execute(
      `INSERT INTO local_users (id, username, phone, password_hash, display_name, company_name, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [userId, username, phone, passwordHash, name, company || null, false]
    )

    // 生成JWT
    const token = generateToken({
      userId,
      username,
      phone
    })

    const newUser = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE id = ?',
      [userId]
    )

    if (!newUser) {
      return {
        success: false,
        message: '创建用户失败',
        error: 'CreateFailed'
      }
    }

    const { password_hash, ...userWithoutPassword } = newUser

    return {
      success: true,
      message: '注册成功',
      data: {
        user: userWithoutPassword,
        token
      }
    }
  }, {
    body: t.Object({
      phone: t.String(),
      code: t.String(),
      name: t.String(),
      company: t.Optional(t.String()),
      password: t.String(),
      confirmPassword: t.String()
    })
  })

  // OAuth登录入口
  .get('/oauth/:provider', async ({ params, set }): Promise<ApiResponse> => {
    const { provider } = params

    if (!['google', 'github'].includes(provider)) {
      set.status = 400
      return {
        success: false,
        message: '不支持的登录方式',
        error: 'UnsupportedProvider'
      }
    }

    // 这里应该重定向到OAuth提供商的授权页面
    // 实际项目中需要配置OAuth应用并实现完整的OAuth流程
    return {
      success: true,
      message: `重定向到${provider}登录`,
      data: { provider }
    }
  })

  // OAuth回调
  .get('/oauth/:provider/callback', async ({ params, query }): Promise<ApiResponse> => {
    const { provider } = params
    const { code } = query

    // 实际项目中需要使用code换取access token，然后获取用户信息
    // 这里仅做演示
    return {
      success: true,
      message: `OAuth登录成功`,
      data: { provider, code }
    }
  })

  // 获取所有本地用户（用于切换）
  .get('/users', async (): Promise<ApiResponse> => {
    const users = await query<LocalUser>(
      'SELECT id, username, email, is_default, created_at, last_login_at FROM local_users ORDER BY created_at DESC'
    )

    return {
      success: true,
      message: '获取用户列表成功',
      data: { users }
    }
  })

  // 切换用户
  .post('/switch/:userId', async ({ params, set }): Promise<ApiResponse> => {
    const { userId } = params

    const user = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE id = ?',
      [userId]
    )

    if (!user) {
      set.status = 404
      return {
        success: false,
        message: '用户不存在',
        error: 'UserNotFound'
      }
    }

    // 更新最后登录时间
    await execute(
      'UPDATE local_users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    )

    // 生成JWT
    const token = generateToken({
      userId: user.id,
      username: user.username
    })

    const { password_hash, ...userWithoutPassword } = user

    return {
      success: true,
      message: '切换用户成功',
      data: {
        user: userWithoutPassword,
        token
      }
    }
  })

  // 更新用户信息
  .put('/me', async ({ headers, body, set }): Promise<ApiResponse> => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return {
        success: false,
        message: '未登录',
        error: 'Unauthorized'
      }
    }

    const token = authHeader.substring(7)
    const { verifyToken } = await import('../lib/jwt')
    const payload = verifyToken(token)

    const { username, email, password } = body as { username?: string; email?: string; password?: string }
    const updates: string[] = []
    const values: any[] = []

    if (username) {
      // 检查新用户名是否已被其他用户使用
      const existingUser = await queryOne<LocalUser>(
        'SELECT * FROM local_users WHERE username = ? AND id != ?',
        [username, payload.userId]
      )
      if (existingUser) {
        set.status = 400
        return {
          success: false,
          message: '用户名已被使用',
          error: 'UsernameExists'
        }
      }
      updates.push('username = ?')
      values.push(username)
    }

    if (email) {
      // 检查新邮箱是否已被其他用户使用
      const existingUser = await queryOne<LocalUser>(
        'SELECT * FROM local_users WHERE email = ? AND id != ?',
        [email, payload.userId]
      )
      if (existingUser) {
        set.status = 400
        return {
          success: false,
          message: '邮箱已被使用',
          error: 'EmailExists'
        }
      }
      updates.push('email = ?')
      values.push(email)
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10)
      updates.push('password_hash = ?')
      values.push(passwordHash)
    }

    if (updates.length === 0) {
      return {
        success: false,
        message: '没有要更新的内容',
        error: 'NoUpdates'
      }
    }

    updates.push('updated_at = NOW()')
    values.push(payload.userId)

    await execute(
      `UPDATE local_users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    const updatedUser = await queryOne<LocalUser>(
      'SELECT * FROM local_users WHERE id = ?',
      [payload.userId]
    )

    if (!updatedUser) {
      set.status = 500
      return {
        success: false,
        message: '更新失败',
        error: 'UpdateFailed'
      }
    }

    const { password_hash, ...userWithoutPassword } = updatedUser

    return {
      success: true,
      message: '更新成功',
      data: { user: userWithoutPassword }
    }
  }, {
    body: t.Object({
      username: t.Optional(t.String()),
      email: t.Optional(t.String({ format: 'email' })),
      password: t.Optional(t.String())
    })
  })

  // 删除用户
  .delete('/users/:userId', async ({ params, headers, set }): Promise<ApiResponse> => {
    const { userId } = params

    // 获取当前登录用户
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return {
        success: false,
        message: '未登录',
        error: 'Unauthorized'
      }
    }

    const token = authHeader.substring(7)
    const { verifyToken } = await import('../lib/jwt')
    const payload = verifyToken(token)

    // 不能删除自己
    if (userId === payload.userId) {
      set.status = 400
      return {
        success: false,
        message: '不能删除当前登录的用户',
        error: 'CannotDeleteSelf'
      }
    }

    const result = await execute(
      'DELETE FROM local_users WHERE id = ?',
      [userId]
    )

    if (result.affectedRows === 0) {
      set.status = 404
      return {
        success: false,
        message: '用户不存在',
        error: 'UserNotFound'
      }
    }

    return {
      success: true,
      message: '删除成功'
    }
  })

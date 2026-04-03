import * as jwt from 'jsonwebtoken'
import type { JWTPayload } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'kane-work-secret-key-local'
const JWT_EXPIRES_IN = '7d' // Token有效期7天

// 生成JWT Token
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// 验证JWT Token
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

// 解码JWT Token（不验证）
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}

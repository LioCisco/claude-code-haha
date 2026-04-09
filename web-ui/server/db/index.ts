import * as mysql from 'mysql2/promise'

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'kane-work',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // 允许公钥检索（MySQL 8.0+ 默认认证插件需要）
  allowPublicKeyRetrieval: true,
  // 不使用 SSL（本地开发）
  ssl: false,
  // 禁用自动类型转换，JSON 字段返回原始字符串（指定utf8编码）
  typeCast: (field: any, next: any) => {
    if (field.type === 'JSON') {
      return field.string('utf8')
    }
    return next()
  },
}

// 创建连接池
const pool = mysql.createPool(dbConfig)

// 测试连接
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection()
    console.log('✅ 数据库连接成功')
    connection.release()
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
    return false
  }
}

// 执行查询
export async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params)
  return rows as T[]
}

// 执行单行查询
export async function queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

// 执行插入/更新/删除
export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params)
  return result as mysql.ResultSetHeader
}

// 获取连接（用于事务）
export async function getConnection() {
  return await pool.getConnection()
}

// 事务包装器
export async function withTransaction<T>(fn: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection()
  await connection.beginTransaction()

  try {
    const result = await fn(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// 运行数据库迁移
async function runMigrations(): Promise<void> {
  try {
    // 检查并添加 local_users 表的 phone 字段
    const phoneExists = await queryOne(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'local_users' AND COLUMN_NAME = 'phone'`,
      []
    )
    if ((phoneExists as any)?.count === 0) {
      await pool.execute(`ALTER TABLE local_users ADD COLUMN phone VARCHAR(20) UNIQUE AFTER email`)
      console.log('✅ Migration: Added phone column to local_users')
    }

    // 检查并添加 display_name 字段
    const displayNameExists = await queryOne(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'local_users' AND COLUMN_NAME = 'display_name'`,
      []
    )
    if ((displayNameExists as any)?.count === 0) {
      await pool.execute(`ALTER TABLE local_users ADD COLUMN display_name VARCHAR(100) AFTER password_hash`)
      console.log('✅ Migration: Added display_name column to local_users')
    }

    // 检查并添加 company_name 字段
    const companyNameExists = await queryOne(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'local_users' AND COLUMN_NAME = 'company_name'`,
      []
    )
    if ((companyNameExists as any)?.count === 0) {
      await pool.execute(`ALTER TABLE local_users ADD COLUMN company_name VARCHAR(255) AFTER display_name`)
      console.log('✅ Migration: Added company_name column to local_users')
    }

    // 检查并更新 verification_codes 表的 phone 字段
    const vcPhoneExists = await queryOne(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'verification_codes' AND COLUMN_NAME = 'phone'`,
      []
    )
    if ((vcPhoneExists as any)?.count === 0) {
      await pool.execute(`ALTER TABLE verification_codes ADD COLUMN phone VARCHAR(20) AFTER email`)
      await pool.execute(`ALTER TABLE verification_codes MODIFY email VARCHAR(255) NULL`)
      console.log('✅ Migration: Added phone column to verification_codes')
    }

    // 检查并更新 verification_codes 表的 type 字段添加 phone_login
    try {
      await pool.execute(`ALTER TABLE verification_codes MODIFY type ENUM('register', 'reset_password', 'phone_login') NOT NULL`)
    } catch {
      // 可能已经是最新的，忽略错误
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// 初始化数据库（创建表）
export async function initDatabase(): Promise<void> {
  try {
    const fs = await import('fs')
    const path = await import('path')

    const sqlPath = path.join(__dirname, 'init.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    // 分割SQL语句并执行
    const statements = sql.split(';').filter(s => s.trim())

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.execute(statement)
        } catch (err) {
          // 忽略表已存在的错误
          if ((err as any).code !== 'ER_TABLE_EXISTS_ERROR' && !(err as any).message?.includes('Duplicate')) {
            console.warn('⚠️ 执行SQL警告:', (err as Error).message)
          }
        }
      }
    }

    // 运行迁移
    await runMigrations()

    console.log('✅ 数据库初始化完成')
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}

// ==================== Chat Session Functions ====================

// Create chat session
export async function createSession(sessionId: string, options?: {
  userId?: string
  title?: string
  agentId?: string
  agentName?: string
  agentAvatar?: string
  systemPrompt?: string
  metadata?: Record<string, unknown>
}) {
  await execute(`
    INSERT INTO chat_sessions (id, user_id, title, agent_id, agent_name, agent_avatar, system_prompt, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    sessionId,
    options?.userId || null,
    options?.title || null,
    options?.agentId || null,
    options?.agentName || null,
    options?.agentAvatar || null,
    options?.systemPrompt || null,
    options?.metadata ? JSON.stringify(options.metadata) : null
  ])
}

// Get session messages
export async function getSessionMessages(sessionId: string, limit: number = 100) {
  const rows = await query<any>(`
    SELECT * FROM chat_messages
    WHERE session_id = ?
    ORDER BY timestamp ASC
    LIMIT ${parseInt(String(limit))}
  `, [sessionId])

  return rows.map(row => ({
    id: String(row.id),
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    agentId: row.agent_id,
    agentName: row.agent_name,
    agentAvatar: row.agent_avatar,
    toolName: row.tool_name,
    toolInput: row.tool_input ? (() => {
      // If already an object (mysql2 auto-parsed), return as-is
      if (typeof row.tool_input === 'object') {
        return row.tool_input;
      }
      // If it's a string, try to parse it
      if (typeof row.tool_input === 'string') {
        try {
          return JSON.parse(row.tool_input);
        } catch {
          // Try to parse as JavaScript object literal (e.g., { query: 'value' })
          try {
            // Convert JS object format to JSON: wrap unquoted keys with quotes
            const jsonLike = row.tool_input.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
            return JSON.parse(jsonLike);
          } catch {
            // Return raw string if all parsing fails
            return row.tool_input;
          }
        }
      }
      return row.tool_input;
    })() : undefined,
    toolResult: row.tool_result,
    isError: row.is_error,
    timestamp: row.timestamp
  }))
}

// Save message
export async function saveMessage(message: {
  sessionId: string
  role: 'user' | 'assistant' | 'system' | 'agent'
  content: string
  agentId?: string
  agentName?: string
  agentAvatar?: string
  toolName?: string
  toolInput?: Record<string, unknown> | string
  toolResult?: string
  isError?: boolean
}) {
  const [result] = await pool.execute(`
    INSERT INTO chat_messages
    (session_id, role, content, agent_id, agent_name, agent_avatar, tool_name, tool_input, tool_result, is_error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    message.sessionId,
    message.role,
    message.content,
    message.agentId || null,
    message.agentName || null,
    message.agentAvatar || null,
    message.toolName || null,
    message.toolInput ? JSON.stringify(message.toolInput) : null,
    message.toolResult || null,
    message.isError || false
  ])
  return result
}

// Check database health
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const connection = await pool.getConnection()
    await connection.ping()
    connection.release()
    return true
  } catch {
    return false
  }
}

// Get all sessions for a user
export async function getUserSessions(userId?: string, limit: number = 50) {
  const sql = userId
    ? `SELECT * FROM chat_sessions WHERE user_id = ? AND is_active = TRUE ORDER BY updated_at DESC LIMIT ${parseInt(String(limit))}`
    : `SELECT * FROM chat_sessions WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT ${parseInt(String(limit))}`
  const params = userId ? [userId] : []
  const rows = await query<any>(sql, params)
  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    title: row.title || '新对话',
    agentId: row.agent_id,
    agentName: row.agent_name,
    agentAvatar: row.agent_avatar,
    systemPrompt: row.system_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  }))
}

// Update session title
export async function updateSessionTitle(sessionId: string, title: string) {
  await execute(
    'UPDATE chat_sessions SET title = ?, updated_at = NOW() WHERE id = ?',
    [title, sessionId]
  )
}

// Soft delete session
export async function softDeleteSession(sessionId: string) {
  await execute(
    'UPDATE chat_sessions SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
    [sessionId]
  )
}

// ==================== Agent Functions ====================

// Get all agents
export async function getAllAgents(userId?: string): Promise<any[]> {
  // Return all active agents (both default and custom)
  // If userId provided, also include that user's custom agents
  const sql = userId
    ? `SELECT * FROM agents WHERE is_active = TRUE AND (is_default = TRUE OR user_id = ?) ORDER BY is_default DESC, created_at ASC`
    : `SELECT * FROM agents WHERE is_active = TRUE ORDER BY is_default DESC, created_at ASC`
  const params = userId ? [userId] : []
  return await query<any>(sql, params)
}

// Get agent by ID
export async function getAgentById(agentId: string, userId?: string): Promise<any | null> {
  // If userId provided, check both default agents and user's custom agents
  // If no userId, allow fetching any agent (default or custom without user_id)
  const sql = userId
    ? `SELECT * FROM agents WHERE id = ? AND (is_default = TRUE OR user_id = ?)`
    : `SELECT * FROM agents WHERE id = ?`
  const params = userId ? [agentId, userId] : [agentId]
  return await queryOne<any>(sql, params)
}

// Create new agent
export async function createAgent(agentData: {
  id: string
  userId?: string
  name: string
  role: string
  avatar: string
  description: string
  skills: string[]
  model: string
  color: string
  systemPrompt?: string
  isActive?: boolean
}): Promise<void> {
  await execute(`
    INSERT INTO agents (id, user_id, name, role, avatar, description, skills, model, color, system_prompt, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    agentData.id,
    agentData.userId || null,
    agentData.name,
    agentData.role,
    agentData.avatar,
    agentData.description,
    JSON.stringify(agentData.skills),
    agentData.model,
    agentData.color,
    agentData.systemPrompt || null,
    agentData.isActive !== false
  ])
}

// Update agent
export async function updateAgent(agentId: string, updates: Partial<{
  name: string
  role: string
  avatar: string
  description: string
  skills: string[]
  model: string
  color: string
  systemPrompt: string
  isActive: boolean
}>, userId?: string): Promise<boolean> {
  // Only allow updating non-default agents owned by the user
  const checkSql = userId
    ? `SELECT * FROM agents WHERE id = ? AND is_default = FALSE AND user_id = ?`
    : `SELECT * FROM agents WHERE id = ? AND is_default = FALSE AND user_id IS NULL`
  const checkParams = userId ? [agentId, userId] : [agentId]

  const existing = await queryOne<any>(checkSql, checkParams)
  if (!existing) return false

  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.role !== undefined) {
    fields.push('role = ?')
    values.push(updates.role)
  }
  if (updates.avatar !== undefined) {
    fields.push('avatar = ?')
    values.push(updates.avatar)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description)
  }
  if (updates.skills !== undefined) {
    fields.push('skills = ?')
    values.push(JSON.stringify(updates.skills))
  }
  if (updates.model !== undefined) {
    fields.push('model = ?')
    values.push(updates.model)
  }
  if (updates.color !== undefined) {
    fields.push('color = ?')
    values.push(updates.color)
  }
  if (updates.systemPrompt !== undefined) {
    fields.push('system_prompt = ?')
    values.push(updates.systemPrompt)
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?')
    values.push(updates.isActive)
  }

  if (fields.length === 0) return true

  fields.push('updated_at = NOW()')
  values.push(agentId)

  const result = await execute(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values)
  return result.affectedRows > 0
}

// Delete agent
export async function deleteAgent(agentId: string, userId?: string): Promise<boolean> {
  const sql = userId
    ? `DELETE FROM agents WHERE id = ? AND is_default = FALSE AND user_id = ?`
    : `DELETE FROM agents WHERE id = ? AND is_default = FALSE AND user_id IS NULL`
  const params = userId ? [agentId, userId] : [agentId]

  const result = await execute(sql, params)
  return result.affectedRows > 0
}

// Toggle agent status
export async function toggleAgentStatus(agentId: string, userId?: string): Promise<boolean> {
  const checkSql = `SELECT is_default FROM agents WHERE id = ?`
  const agent = await queryOne<any>(checkSql, [agentId])

  if (!agent || agent.is_default) return false

  const sql = userId
    ? `UPDATE agents SET is_active = NOT is_active, updated_at = NOW() WHERE id = ? AND user_id = ?`
    : `UPDATE agents SET is_active = NOT is_active, updated_at = NOW() WHERE id = ? AND user_id IS NULL`
  const params = userId ? [agentId, userId] : [agentId]

  const result = await execute(sql, params)
  return result.affectedRows > 0
}

// ==================== Skills Functions ====================

// Get all skills
export async function getAllSkills(category?: string): Promise<any[]> {
  const sql = category
    ? `SELECT * FROM skills WHERE status = 'active' AND category = ? ORDER BY is_built_in DESC, name ASC`
    : `SELECT * FROM skills WHERE status = 'active' ORDER BY is_built_in DESC, name ASC`
  const params = category ? [category] : []
  return await query<any>(sql, params)
}

// Get skill by ID
export async function getSkillById(skillId: string): Promise<any | null> {
  return await queryOne<any>('SELECT * FROM skills WHERE id = ?', [skillId])
}

// Get skills by IDs
export async function getSkillsByIds(skillIds: string[]): Promise<any[]> {
  if (skillIds.length === 0) return []
  const placeholders = skillIds.map(() => '?').join(',')
  return await query<any>(`SELECT * FROM skills WHERE id IN (${placeholders})`, skillIds)
}

// Create new skill
export async function createSkill(skillData: {
  id: string
  name: string
  description: string
  icon: string
  category: string
  status?: string
  configSchema?: Record<string, unknown>
}): Promise<void> {
  await execute(`
    INSERT INTO skills (id, name, description, icon, category, status, is_built_in, config_schema)
    VALUES (?, ?, ?, ?, ?, ?, FALSE, ?)
  `, [
    skillData.id,
    skillData.name,
    skillData.description,
    skillData.icon,
    skillData.category,
    skillData.status || 'active',
    skillData.configSchema ? JSON.stringify(skillData.configSchema) : null
  ])
}

// Update skill usage count
export async function incrementSkillUsage(skillId: string): Promise<void> {
  await execute(
    'UPDATE skills SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = ?',
    [skillId]
  )
}

export { pool }
export default pool

// ==================== Scheduled Tasks Functions ====================

export interface ScheduledTaskDB {
  id: string
  name: string
  description?: string
  agent_id: string
  agent_name?: string
  session_id?: string
  prompt: string
  schedule_type: 'once' | 'daily' | 'interval' | 'cron'
  schedule_value: string
  enabled: boolean
  last_run_at?: Date
  next_run_at?: Date
  total_runs: number
  success_runs: number
  fail_runs: number
  created_at: Date
  updated_at: Date
}

export interface TaskResultDB {
  id: string
  task_id: string
  status: 'running' | 'success' | 'error'
  output?: string
  error_message?: string
  duration_ms?: number
  created_at: Date
}

// Get all scheduled tasks
export async function getAllScheduledTasks(): Promise<ScheduledTaskDB[]> {
  return await query<ScheduledTaskDB>(
    'SELECT * FROM scheduled_tasks ORDER BY created_at DESC'
  )
}

// Get scheduled task by ID
export async function getScheduledTaskById(taskId: string): Promise<ScheduledTaskDB | null> {
  return await queryOne<ScheduledTaskDB>('SELECT * FROM scheduled_tasks WHERE id = ?', [taskId])
}

// Get enabled scheduled tasks
export async function getEnabledScheduledTasks(): Promise<ScheduledTaskDB[]> {
  return await query<ScheduledTaskDB>(
    'SELECT * FROM scheduled_tasks WHERE enabled = TRUE ORDER BY next_run_at ASC'
  )
}

// Create new scheduled task
export async function createScheduledTask(taskData: {
  id?: string
  name: string
  description?: string
  agent_id: string
  agent_name?: string
  session_id?: string
  prompt: string
  schedule_type: 'once' | 'daily' | 'interval' | 'cron'
  schedule_value: string
  enabled?: boolean
  next_run_at?: Date
}): Promise<string> {
  const id = taskData.id || Math.random().toString(36).substring(2, 15)
  await execute(`
    INSERT INTO scheduled_tasks 
    (id, name, description, agent_id, agent_name, session_id, prompt, 
     schedule_type, schedule_value, enabled, next_run_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    taskData.name,
    taskData.description || null,
    taskData.agent_id,
    taskData.agent_name || null,
    taskData.session_id || null,
    taskData.prompt,
    taskData.schedule_type,
    taskData.schedule_value,
    taskData.enabled !== false,
    taskData.next_run_at || null
  ])
  return id
}

// Update scheduled task
export async function updateScheduledTask(
  taskId: string,
  updates: Partial<{
    name: string
    description: string
    agent_id: string
    agent_name: string
    session_id: string
    prompt: string
    schedule_type: 'once' | 'daily' | 'interval' | 'cron'
    schedule_value: string
    enabled: boolean
    next_run_at: Date
  }>
): Promise<boolean> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description)
  }
  if (updates.agent_id !== undefined) {
    fields.push('agent_id = ?')
    values.push(updates.agent_id)
  }
  if (updates.agent_name !== undefined) {
    fields.push('agent_name = ?')
    values.push(updates.agent_name)
  }
  if (updates.session_id !== undefined) {
    fields.push('session_id = ?')
    values.push(updates.session_id)
  }
  if (updates.prompt !== undefined) {
    fields.push('prompt = ?')
    values.push(updates.prompt)
  }
  if (updates.schedule_type !== undefined) {
    fields.push('schedule_type = ?')
    values.push(updates.schedule_type)
  }
  if (updates.schedule_value !== undefined) {
    fields.push('schedule_value = ?')
    values.push(updates.schedule_value)
  }
  if (updates.enabled !== undefined) {
    fields.push('enabled = ?')
    values.push(updates.enabled)
  }
  if (updates.next_run_at !== undefined) {
    fields.push('next_run_at = ?')
    values.push(updates.next_run_at)
  }

  if (fields.length === 0) return true

  fields.push('updated_at = NOW()')
  values.push(taskId)

  const result = await execute(
    `UPDATE scheduled_tasks SET ${fields.join(', ')} WHERE id = ?`,
    values
  )
  return result.affectedRows > 0
}

// Toggle task enabled status
export async function toggleScheduledTask(taskId: string, enabled: boolean): Promise<boolean> {
  const result = await execute(
    'UPDATE scheduled_tasks SET enabled = ?, updated_at = NOW() WHERE id = ?',
    [enabled, taskId]
  )
  return result.affectedRows > 0
}

// Delete scheduled task
export async function deleteScheduledTask(taskId: string): Promise<boolean> {
  const result = await execute('DELETE FROM scheduled_tasks WHERE id = ?', [taskId])
  return result.affectedRows > 0
}

// Update task execution stats
export async function updateTaskExecutionStats(
  taskId: string,
  status: 'success' | 'error',
  durationMs: number
): Promise<void> {
  await execute(`
    UPDATE scheduled_tasks 
    SET total_runs = total_runs + 1,
        ${status === 'success' ? 'success_runs = success_runs + 1' : 'fail_runs = fail_runs + 1'},
        last_run_at = NOW(),
        updated_at = NOW()
    WHERE id = ?
  `, [taskId])
}

// Update next run time
export async function updateTaskNextRun(taskId: string, nextRunAt: Date | null): Promise<void> {
  await execute(
    'UPDATE scheduled_tasks SET next_run_at = ? WHERE id = ?',
    [nextRunAt, taskId]
  )
}

// Create task result
export async function createTaskResult(resultData: {
  id?: string
  task_id: string
  status: 'running' | 'success' | 'error'
  output?: string
  error_message?: string
  duration_ms?: number
}): Promise<string> {
  const id = resultData.id || Math.random().toString(36).substring(2, 15)
  await execute(`
    INSERT INTO scheduled_task_results 
    (id, task_id, status, output, error_message, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    resultData.task_id,
    resultData.status,
    resultData.output || null,
    resultData.error_message || null,
    resultData.duration_ms || null
  ])
  return id
}

// Update task result
export async function updateTaskResult(
  resultId: string,
  updates: {
    status: 'success' | 'error'
    output?: string
    error_message?: string
    duration_ms: number
  }
): Promise<void> {
  await execute(`
    UPDATE scheduled_task_results 
    SET status = ?, output = ?, error_message = ?, duration_ms = ?
    WHERE id = ?
  `, [updates.status, updates.output || null, updates.error_message || null, updates.duration_ms, resultId])
}

// Get task results
export async function getTaskResults(taskId: string, limit: number = 50): Promise<TaskResultDB[]> {
  return await query<TaskResultDB>(
    `SELECT * FROM scheduled_task_results WHERE task_id = ? ORDER BY created_at DESC LIMIT ${parseInt(String(limit))}`,
    [taskId]
  )
}

// Get recent task results for all tasks
export async function getRecentTaskResults(limit: number = 100): Promise<TaskResultDB[]> {
  return await query<TaskResultDB>(
    `SELECT * FROM scheduled_task_results ORDER BY created_at DESC LIMIT ${parseInt(String(limit))}`
  )
}

// ==================== Settings Functions ====================

export interface UserSettingsDB {
  id: string
  user_id: string
  display_name: string | null
  email: string | null
  phone: string | null
  region: string
  avatar_url: string | null
  notify_email: boolean
  notify_push: boolean
  notify_sms: boolean
  notify_marketing: boolean
  two_factor_enabled: boolean
  plan: string
  tokens_limit: number
  tokens_used: number
  tokens_reset_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface UserIntegrationDB {
  id: string
  user_id: string
  platform: string
  platform_name: string
  icon: string
  is_connected: boolean
  store_url: string | null
  store_name: string | null
  metadata: any
  connected_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface TeamMemberDB {
  id: string
  owner_id: string
  user_id: string | null
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  avatar: string | null
  status: 'active' | 'pending' | 'inactive'
  invited_at: Date
  joined_at: Date | null
  created_at: Date
  updated_at: Date
}

// Get user settings
export async function getUserSettings(userId: string = 'default-user'): Promise<UserSettingsDB | null> {
  return await queryOne<UserSettingsDB>('SELECT * FROM user_settings WHERE user_id = ?', [userId])
}

// Update user settings
export async function updateUserSettings(
  userId: string,
  updates: Partial<{
    display_name: string
    email: string
    phone: string
    region: string
    avatar_url: string
    notify_email: boolean
    notify_push: boolean
    notify_sms: boolean
    notify_marketing: boolean
    two_factor_enabled: boolean
  }>
): Promise<boolean> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.display_name !== undefined) {
    fields.push('display_name = ?')
    values.push(updates.display_name)
  }
  if (updates.email !== undefined) {
    fields.push('email = ?')
    values.push(updates.email)
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?')
    values.push(updates.phone)
  }
  if (updates.region !== undefined) {
    fields.push('region = ?')
    values.push(updates.region)
  }
  if (updates.avatar_url !== undefined) {
    fields.push('avatar_url = ?')
    values.push(updates.avatar_url)
  }
  if (updates.notify_email !== undefined) {
    fields.push('notify_email = ?')
    values.push(updates.notify_email)
  }
  if (updates.notify_push !== undefined) {
    fields.push('notify_push = ?')
    values.push(updates.notify_push)
  }
  if (updates.notify_sms !== undefined) {
    fields.push('notify_sms = ?')
    values.push(updates.notify_sms)
  }
  if (updates.notify_marketing !== undefined) {
    fields.push('notify_marketing = ?')
    values.push(updates.notify_marketing)
  }
  if (updates.two_factor_enabled !== undefined) {
    fields.push('two_factor_enabled = ?')
    values.push(updates.two_factor_enabled)
  }

  if (fields.length === 0) return true

  fields.push('updated_at = NOW()')
  values.push(userId)

  const result = await execute(
    `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`,
    values
  )
  return result.affectedRows > 0
}

// Update token usage
export async function updateTokenUsage(userId: string, tokensUsed: number): Promise<void> {
  await execute(
    'UPDATE user_settings SET tokens_used = tokens_used + ? WHERE user_id = ?',
    [tokensUsed, userId]
  )
}

// Get user integrations
export async function getUserIntegrations(userId: string = 'default-user'): Promise<UserIntegrationDB[]> {
  return await query<UserIntegrationDB>(
    'SELECT * FROM user_integrations WHERE user_id = ? ORDER BY platform_name ASC',
    [userId]
  )
}

// Update integration status
export async function updateIntegration(
  userId: string,
  platform: string,
  updates: {
    is_connected: boolean
    access_token?: string
    refresh_token?: string
    store_url?: string
    store_name?: string
    metadata?: any
  }
): Promise<boolean> {
  const fields: string[] = ['is_connected = ?']
  const values: any[] = [updates.is_connected]

  if (updates.access_token !== undefined) {
    fields.push('access_token = ?')
    values.push(updates.access_token)
  }
  if (updates.refresh_token !== undefined) {
    fields.push('refresh_token = ?')
    values.push(updates.refresh_token)
  }
  if (updates.store_url !== undefined) {
    fields.push('store_url = ?')
    values.push(updates.store_url)
  }
  if (updates.store_name !== undefined) {
    fields.push('store_name = ?')
    values.push(updates.store_name)
  }
  if (updates.metadata !== undefined) {
    fields.push('metadata = ?')
    values.push(JSON.stringify(updates.metadata))
  }

  fields.push('connected_at = ?')
  values.push(updates.is_connected ? new Date() : null)
  fields.push('updated_at = NOW()')
  values.push(userId, platform)

  const result = await execute(
    `UPDATE user_integrations SET ${fields.join(', ')} WHERE user_id = ? AND platform = ?`,
    values
  )
  return result.affectedRows > 0
}

// Get team members
export async function getTeamMembers(ownerId: string = 'default-user'): Promise<TeamMemberDB[]> {
  return await query<TeamMemberDB>(
    'SELECT * FROM team_members WHERE owner_id = ? ORDER BY FIELD(role, "owner", "admin", "member"), created_at ASC',
    [ownerId]
  )
}

// Add team member
export async function addTeamMember(data: {
  id?: string
  owner_id: string
  name: string
  email: string
  role: 'admin' | 'member'
  avatar?: string
}): Promise<string> {
  const id = data.id || Math.random().toString(36).substring(2, 15)
  await execute(
    `INSERT INTO team_members (id, owner_id, name, email, role, avatar, status, invited_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
    [id, data.owner_id, data.name, data.email, data.role, data.avatar || null]
  )
  return id
}

// Update team member
export async function updateTeamMember(
  memberId: string,
  ownerId: string,
  updates: {
    name?: string
    role?: 'admin' | 'member'
    status?: 'active' | 'pending' | 'inactive'
  }
): Promise<boolean> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.role !== undefined) {
    fields.push('role = ?')
    values.push(updates.role)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
    if (updates.status === 'active') {
      fields.push('joined_at = NOW()')
    }
  }

  if (fields.length === 0) return true

  fields.push('updated_at = NOW()')
  values.push(memberId, ownerId)

  const result = await execute(
    `UPDATE team_members SET ${fields.join(', ')} WHERE id = ? AND owner_id = ?`,
    values
  )
  return result.affectedRows > 0
}

// Delete team member
export async function deleteTeamMember(memberId: string, ownerId: string): Promise<boolean> {
  const result = await execute(
    'DELETE FROM team_members WHERE id = ? AND owner_id = ? AND role != "owner"',
    [memberId, ownerId]
  )
  return result.affectedRows > 0
}

// ==================== Workflow Functions ====================

export interface WorkflowDB {
  id: string
  user_id: string
  name: string
  description: string | null
  version: string
  nodes: any[]
  edges: any[]
  variables: any[]
  status: 'draft' | 'active' | 'disabled'
  is_public: boolean
  execution_count: number
  last_execution_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface WorkflowExecutionDB {
  id: string
  workflow_id: string
  user_id: string
  run_id: string
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
  input: any
  output: any
  error_message: string | null
  steps: any[]
  variables: any
  started_at: Date | null
  ended_at: Date | null
  duration_ms: number | null
  created_at: Date
}

// Get all workflows for user
export async function getUserWorkflows(userId: string): Promise<WorkflowDB[]> {
  return await query<WorkflowDB>(
    'SELECT * FROM workflows WHERE user_id = ? ORDER BY updated_at DESC',
    [userId]
  )
}

// Get workflow by ID
export async function getWorkflowById(workflowId: string, userId?: string): Promise<WorkflowDB | null> {
  const sql = userId
    ? 'SELECT * FROM workflows WHERE id = ? AND (user_id = ? OR is_public = TRUE)'
    : 'SELECT * FROM workflows WHERE id = ? AND is_public = TRUE'
  const params = userId ? [workflowId, userId] : [workflowId]
  return await queryOne<WorkflowDB>(sql, params)
}

// Create workflow
export async function createWorkflow(data: {
  id: string
  userId: string
  name: string
  description?: string
  nodes: any[]
  edges: any[]
  variables?: any[]
}): Promise<void> {
  await execute(
    `INSERT INTO workflows (id, user_id, name, description, nodes, edges, variables)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.id,
      data.userId,
      data.name,
      data.description || null,
      JSON.stringify(data.nodes),
      JSON.stringify(data.edges),
      JSON.stringify(data.variables || [])
    ]
  )
}

// Update workflow
export async function updateWorkflow(
  workflowId: string,
  userId: string,
  updates: Partial<{
    name: string
    description: string
    nodes: any[]
    edges: any[]
    variables: any[]
    status: 'draft' | 'active' | 'disabled'
    isPublic: boolean
    version: string
  }>
): Promise<boolean> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description)
  }
  if (updates.nodes !== undefined) {
    fields.push('nodes = ?')
    values.push(JSON.stringify(updates.nodes))
  }
  if (updates.edges !== undefined) {
    fields.push('edges = ?')
    values.push(JSON.stringify(updates.edges))
  }
  if (updates.variables !== undefined) {
    fields.push('variables = ?')
    values.push(JSON.stringify(updates.variables))
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.is_public !== undefined) {
    fields.push('is_public = ?')
    values.push(updates.is_public)
  }
  if (updates.version !== undefined) {
    fields.push('version = ?')
    values.push(updates.version)
  }

  if (fields.length === 0) return true

  fields.push('updated_at = NOW()')
  values.push(workflowId, userId)

  const result = await execute(
    `UPDATE workflows SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  )
  return result.affectedRows > 0
}

// Delete workflow
export async function deleteWorkflow(workflowId: string, userId: string): Promise<boolean> {
  const result = await execute(
    'DELETE FROM workflows WHERE id = ? AND user_id = ?',
    [workflowId, userId]
  )
  return result.affectedRows > 0
}

// Increment execution count
export async function incrementWorkflowExecutionCount(workflowId: string): Promise<void> {
  await execute(
    'UPDATE workflows SET execution_count = execution_count + 1, last_execution_at = NOW() WHERE id = ?',
    [workflowId]
  )
}

// Create execution record
export async function createExecutionRecord(data: {
  id: string
  workflowId: string
  userId: string
  runId: string
  input?: any
}): Promise<void> {
  await execute(
    `INSERT INTO workflow_executions (id, workflow_id, user_id, run_id, input, status, started_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
    [data.id, data.workflowId, data.userId, data.runId, data.input ? JSON.stringify(data.input) : null]
  )
}

// Update execution status
export async function updateExecutionStatus(
  executionId: string,
  updates: {
    status?: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
    output?: any
    errorMessage?: string
    steps?: any[]
    variables?: any
    endedAt?: Date
    durationMs?: number
  }
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []

  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.output !== undefined) {
    fields.push('output = ?')
    values.push(JSON.stringify(updates.output))
  }
  if (updates.errorMessage !== undefined) {
    fields.push('error_message = ?')
    values.push(updates.errorMessage)
  }
  if (updates.steps !== undefined) {
    fields.push('steps = ?')
    values.push(JSON.stringify(updates.steps))
  }
  if (updates.variables !== undefined) {
    fields.push('variables = ?')
    values.push(JSON.stringify(updates.variables))
  }
  if (updates.endedAt !== undefined) {
    fields.push('ended_at = ?')
    values.push(updates.endedAt)
  }
  if (updates.durationMs !== undefined) {
    fields.push('duration_ms = ?')
    values.push(updates.durationMs)
  }

  if (fields.length === 0) return

  values.push(executionId)
  await execute(
    `UPDATE workflow_executions SET ${fields.join(', ')} WHERE id = ?`,
    values
  )
}

// Get execution records
export async function getWorkflowExecutions(
  workflowId: string,
  limit: number = 50
): Promise<WorkflowExecutionDB[]> {
  return await query<WorkflowExecutionDB>(
    `SELECT * FROM workflow_executions
     WHERE workflow_id = ?
     ORDER BY created_at DESC
     LIMIT ${parseInt(String(limit))}`,
    [workflowId]
  )
}

// Publish History Types
export interface WorkflowPublishHistoryDB {
  id: string
  workflow_id: string
  user_id: string
  version: string
  changes: string | null
  nodes: any[]
  edges: any[]
  variables: any[]
  published_at: Date
}

// Create publish record
export async function createPublishRecord(data: {
  id: string
  workflowId: string
  userId: string
  version: string
  changes?: string
  nodes: any[]
  edges: any[]
  variables: any[]
}): Promise<void> {
  await execute(
    `INSERT INTO workflow_publish_history
     (id, workflow_id, user_id, version, changes, nodes, edges, variables, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.id,
      data.workflowId,
      data.userId,
      data.version,
      data.changes || null,
      JSON.stringify(data.nodes),
      JSON.stringify(data.edges),
      JSON.stringify(data.variables),
    ]
  )
}

// Get publish history
export async function getPublishHistory(workflowId: string): Promise<WorkflowPublishHistoryDB[]> {
  return await query<WorkflowPublishHistoryDB>(
    `SELECT h.*, u.username as published_by
     FROM workflow_publish_history h
     LEFT JOIN local_users u ON h.user_id = u.id
     WHERE h.workflow_id = ?
     ORDER BY h.published_at DESC`,
    [workflowId]
  )
}

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

    console.log('✅ 数据库初始化完成')
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}

export { pool }
export default pool

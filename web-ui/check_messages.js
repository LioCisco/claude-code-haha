import { getPool } from './server/db/index.ts'

async function checkMessages() {
  const pool = getPool()

  try {
    // 获取最近的10条消息
    const [rows] = await pool.query(`
      SELECT id, session_id, role, content, tool_name, tool_input, tool_result, timestamp
      FROM chat_messages
      ORDER BY timestamp DESC
      LIMIT 10
    `)

    console.log('最近10条消息：\n')
    for (const row of rows) {
      console.log('---')
      console.log('ID:', row.id)
      console.log('Session:', row.session_id)
      console.log('Role:', row.role)
      console.log('Content:', row.content?.substring(0, 100))
      console.log('Tool Name:', row.tool_name)
      console.log('Tool Input:', row.tool_input)
      console.log('Tool Input Type:', typeof row.tool_input)

      // 尝试解析JSON
      if (row.tool_input) {
        try {
          const parsed = JSON.parse(row.tool_input)
          console.log('✅ JSON解析成功:', typeof parsed)
        } catch (e) {
          console.log('❌ JSON解析失败:', e.message)
        }
      }
      console.log('')
    }

  } catch (err) {
    console.error('查询失败:', err)
  } finally {
    await pool.end()
  }
}

checkMessages()

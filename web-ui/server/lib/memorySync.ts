/**
 * 记忆同步服务
 * 在数据库和 Claude Code 文件系统记忆之间同步
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { getUserMemories, createMemory, updateMemory, type MemoryDB } from '../db'

const MEMORY_DIR = path.join(process.cwd(), '..', '..', '.claude', 'memory')

// 确保记忆目录存在
async function ensureMemoryDir(): Promise<void> {
  try {
    await fs.mkdir(MEMORY_DIR, { recursive: true })
  } catch {
    // 目录可能已存在
  }
}

// 将记忆写入文件系统
async function writeMemoryToFile(memory: MemoryDB): Promise<void> {
  await ensureMemoryDir()
  const fileName = `${memory.type}_${memory.id}.md`
  const filePath = path.join(MEMORY_DIR, fileName)

  const content = `---
name: ${memory.name}
description: ${memory.description}
type: ${memory.type}
updated: ${memory.updated_at.toISOString()}
---

${memory.content}
`
  await fs.writeFile(filePath, content, 'utf-8')
}

// 从文件系统读取所有记忆
async function readMemoriesFromFiles(): Promise<Array<{
  id: string
  type: string
  name: string
  description: string
  content: string
  updated: string
}>> {
  try {
    await ensureMemoryDir()
    const files = await fs.readdir(MEMORY_DIR)
    const memories = []

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      const filePath = path.join(MEMORY_DIR, file)
      const content = await fs.readFile(filePath, 'utf-8')

      // 解析 frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/)
      if (!frontmatterMatch) continue

      const frontmatter = frontmatterMatch[1]
      const body = frontmatterMatch[2]

      const name = frontmatter.match(/name:\s*(.+)/)?.[1] || ''
      const description = frontmatter.match(/description:\s*(.+)/)?.[1] || ''
      const type = frontmatter.match(/type:\s*(.+)/)?.[1] || 'reference'
      const updated = frontmatter.match(/updated:\s*(.+)/)?.[1] || new Date().toISOString()
      const id = file.replace(`${type}_`, '').replace('.md', '')

      memories.push({ id, type, name, description, content: body.trim(), updated })
    }

    return memories
  } catch {
    return []
  }
}

// 将数据库记忆同步到文件系统
export async function syncMemoriesToFiles(userId: string): Promise<void> {
  const memories = await getUserMemories(userId)

  for (const memory of memories) {
    await writeMemoryToFile(memory)
  }
}

// 将文件系统记忆同步到数据库
export async function syncMemoriesFromFiles(userId: string): Promise<void> {
  const fileMemories = await readMemoriesFromFiles()

  for (const fileMem of fileMemories) {
    // 检查是否已存在
    const existing = await getUserMemories(userId)
    const found = existing.find(m => m.id === fileMem.id)

    if (found) {
      // 更新现有记忆
      await updateMemory(fileMem.id, userId, {
        name: fileMem.name,
        description: fileMem.description,
        content: fileMem.content,
      })
    } else {
      // 创建新记忆
      await createMemory({
        id: fileMem.id,
        userId,
        name: fileMem.name,
        description: fileMem.description,
        type: fileMem.type as any,
        content: fileMem.content,
        tags: [],
      })
    }
  }
}

// 删除文件系统中的记忆
export async function deleteMemoryFile(memoryId: string, type: string): Promise<void> {
  try {
    const fileName = `${type}_${memoryId}.md`
    const filePath = path.join(MEMORY_DIR, fileName)
    await fs.unlink(filePath)
  } catch {
    // 文件可能不存在
  }
}

// 获取所有记忆文件列表（用于 API）
export async function listMemoryFiles(): Promise<string[]> {
  try {
    await ensureMemoryDir()
    const files = await fs.readdir(MEMORY_DIR)
    return files.filter(f => f.endsWith('.md'))
  } catch {
    return []
  }
}

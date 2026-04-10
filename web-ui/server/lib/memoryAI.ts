/**
 * 记忆 AI 服务
 * 提供记忆相关的 AI 功能：相关性搜索、自动提取
 */

import { searchMemories, getUserMemories, createMemory, type MemoryDB } from '../db'
import { chatWithAI } from './ai'

// 简单的文本相似度计算（基于共同词汇）
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)
  const set1 = new Set(words1)
  const set2 = new Set(words2)

  const intersection = new Set([...set1].filter((x) => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

// 查找相关记忆
export async function findRelevantMemories(
  userId: string,
  query: string,
  limit: number = 3
): Promise<
  Array<{
    id: string
    name: string
    type: string
    content: string
    relevance: number
  }>
> {
  // 获取所有记忆
  const memories = await getUserMemories(userId)

  // 计算相关性分数
  const scored = memories.map((memory) => ({
    id: memory.id,
    name: memory.name,
    type: memory.type,
    content: memory.content.slice(0, 500), // 只取前500字符用于比较
    relevance: calculateSimilarity(query, `${memory.name} ${memory.description} ${memory.content}`),
  }))

  // 排序并返回前N个
  return scored.sort((a, b) => b.relevance - a.relevance).slice(0, limit)
}

// 从对话中提取潜在的记忆
export async function extractMemoryFromConversation(
  userId: string,
  conversation: Array<{ role: string; content: string }>
): Promise<
  | {
      shouldExtract: true
      name: string
      description: string
      type: 'user' | 'feedback' | 'project' | 'reference'
      content: string
      tags: string[]
    }
  | { shouldExtract: false }
> {
  // 构建对话上下文
  const context = conversation.slice(-6).map((m) => `${m.role}: ${m.content}`).join('\n\n')

  const prompt = `分析以下对话，判断是否有值得保存为长期记忆的信息。

对话内容：
${context}

如果对话中包含以下类型的信息，请提取：
1. 用户偏好（喜欢的工具、编码风格、沟通方式）
2. 项目信息（技术栈、架构决策、业务背景）
3. 重要事实（用户的角色、目标、约束条件）
4. 反馈（用户对某事的明确喜欢或不喜欢）

请以JSON格式回复：
{
  "shouldExtract": true/false,
  "name": "记忆的简短标题（10字以内）",
  "description": "描述这是什么类型的记忆",
  "type": "user/feedback/project/reference 之一",
  "content": "详细的记忆内容",
  "tags": ["标签1", "标签2"]
}

如果没有值得保存的信息，返回 {"shouldExtract": false}`

  try {
    const response = await chatWithAI({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })

    // 解析 JSON 响应
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { shouldExtract: false }

    const result = JSON.parse(jsonMatch[0])

    if (!result.shouldExtract) {
      return { shouldExtract: false }
    }

    // 验证类型
    const validTypes = ['user', 'feedback', 'project', 'reference']
    if (!validTypes.includes(result.type)) {
      result.type = 'reference'
    }

    return {
      shouldExtract: true,
      name: result.name,
      description: result.description,
      type: result.type,
      content: result.content,
      tags: result.tags || [],
    }
  } catch (error) {
    console.error('Failed to extract memory:', error)
    return { shouldExtract: false }
  }
}

// 生成记忆相关的系统提示
export function generateMemorySystemPrompt(memories: Array<{ name: string; content: string }>): string {
  if (memories.length === 0) return ''

  const memoryContext = memories
    .map((m, i) => `${i + 1}. ${m.name}: ${m.content.slice(0, 200)}`)
    .join('\n')

  return `
以下是我关于用户的相关记忆，请在回答时参考：

${memoryContext}

请根据这些记忆调整你的回答风格和内容。`
}

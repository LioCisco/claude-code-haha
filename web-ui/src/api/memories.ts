import { apiClient } from '@/lib/api'

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference'

export interface Memory {
  id: string
  name: string
  description: string
  type: MemoryType
  content: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface MemoryInput {
  name: string
  description: string
  type: MemoryType
  content: string
  tags?: string[]
}

// Get all memories
export async function getMemories(type?: MemoryType): Promise<Memory[]> {
  const data = await apiClient.get<{ success: boolean; memories: Memory[]; error?: string }>(
    '/api/memories',
    { params: type ? { type } : undefined }
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch memories')
  }
  return data.memories
}

// Get single memory
export async function getMemory(id: string): Promise<Memory> {
  const data = await apiClient.get<{ success: boolean; memory: Memory; error?: string }>(
    `/api/memories/${id}`
  )
  if (!data.success) {
    throw new Error(data.error || 'Memory not found')
  }
  return data.memory
}

// Create memory
export async function createMemory(input: MemoryInput): Promise<{ memoryId: string }> {
  const data = await apiClient.post<{ success: boolean; memoryId: string; error?: string }>(
    '/api/memories',
    input
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to create memory')
  }
  return { memoryId: data.memoryId }
}

// Update memory
export async function updateMemory(id: string, updates: Partial<MemoryInput>): Promise<void> {
  const data = await apiClient.put<{ success: boolean; error?: string }>(
    `/api/memories/${id}`,
    updates
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to update memory')
  }
}

// Delete memory
export async function deleteMemory(id: string): Promise<void> {
  const data = await apiClient.delete<{ success: boolean; error?: string }>(
    `/api/memories/${id}`
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete memory')
  }
}

// Search memories
export async function searchMemories(query: string): Promise<Memory[]> {
  const data = await apiClient.get<{ success: boolean; memories: Memory[]; error?: string }>(
    '/api/memories/search',
    { params: { q: query } }
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to search memories')
  }
  return data.memories
}

// Get relevant memories for a query (AI-powered)
export async function getRelevantMemories(query: string, limit?: number): Promise<Array<{
  id: string
  name: string
  type: string
  content: string
  relevance: number
}>> {
  const params: Record<string, string> = { q: query }
  if (limit !== undefined) {
    params.limit = limit.toString()
  }
  const data = await apiClient.get<{
    success: boolean
    memories: Array<{
      id: string
      name: string
      type: string
      content: string
      relevance: number
    }>
    error?: string
  }>('/api/memories/relevant', { params })
  if (!data.success) {
    throw new Error(data.error || 'Failed to get relevant memories')
  }
  return data.memories
}

// Extract memory from conversation
export async function extractMemoryFromConversation(
  conversation: Array<{ role: string; content: string }>
): Promise<{
  success: boolean
  shouldExtract: boolean
  memoryId?: string
  memory?: Memory
}> {
  const data = await apiClient.post<{
    success: boolean
    shouldExtract: boolean
    memoryId?: string
    memory?: Memory
    error?: string
  }>('/api/memories/extract', { conversation })
  if (!data.success) {
    throw new Error(data.error || 'Failed to extract memory')
  }
  return data
}

// Sync memories to file system
export async function syncMemoriesToFiles(): Promise<void> {
  const data = await apiClient.post<{ success: boolean; error?: string }>(
    '/api/memories/sync/to-files',
    {}
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to sync memories to files')
  }
}

// Sync memories from file system
export async function syncMemoriesFromFiles(): Promise<void> {
  const data = await apiClient.post<{ success: boolean; error?: string }>(
    '/api/memories/sync/from-files',
    {}
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to sync memories from files')
  }
}

// Get memory files list
export async function getMemoryFiles(): Promise<string[]> {
  const data = await apiClient.get<{ success: boolean; files: string[]; error?: string }>(
    '/api/memories/files'
  )
  if (!data.success) {
    throw new Error(data.error || 'Failed to get memory files')
  }
  return data.files
}

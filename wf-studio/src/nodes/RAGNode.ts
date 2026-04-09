/**
 * RAG 检索节点执行器
 * 从知识库中检索相关文档
 */

import { CanvasNode, NodeExecutor, NodeType, ExecutionContext, RAGNodeConfig, RAGDocument } from '../types';
import { interpolateTemplate } from '../utils/template';

// 简化的向量相似度计算（实际应使用向量数据库）
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 知识库存储
const knowledgeBases = new Map<string, RAGDocument[]>();

export const ragExecutor: NodeExecutor = {
  type: NodeType.RAG_RETRIEVE,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as RAGNodeConfig;
    const variables = Object.fromEntries(context.variables);

    // 插值查询
    const query = interpolateTemplate(config.query, { ...variables, input });

    // 获取知识库
    const documents = knowledgeBases.get(config.knowledgeBaseId);
    if (!documents) {
      throw new Error(`知识库 ${config.knowledgeBaseId} 不存在`);
    }

    // 简单关键词匹配（实际应使用向量检索）
    const results = documents
      .map(doc => ({
        document: doc,
        score: calculateRelevance(query, doc.content),
      }))
      .filter(r => r.score > (config.threshold || 0.5))
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topK || 5);

    return {
      query,
      results: results.map(r => ({
        content: r.document.content,
        metadata: r.document.metadata,
        score: r.score,
      })),
      total: documents.length,
    };
  },

  validate(config: RAGNodeConfig): boolean {
    return !!config.knowledgeBaseId && !!config.query;
  },
};

// 简单的相关性计算
function calculateRelevance(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentWords = content.toLowerCase().split(/\s+/);

  let matches = 0;
  for (const word of queryWords) {
    if (contentWords.some(cw => cw.includes(word))) {
      matches++;
    }
  }

  return matches / queryWords.length;
}

// 添加文档到知识库
export function addToKnowledgeBase(kbId: string, documents: RAGDocument[]): void {
  const existing = knowledgeBases.get(kbId) || [];
  knowledgeBases.set(kbId, [...existing, ...documents]);
}

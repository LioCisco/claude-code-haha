/**
 * LLM 节点执行器
 * 调用 Anthropic API 或其他 LLM 服务
 */

import { CanvasNode, NodeExecutor, NodeType, ExecutionContext, LLMNodeConfig } from '../types';
import Anthropic from '@anthropic-ai/sdk';
import { interpolateTemplate, interpolateObject } from '../lib/template';

// 初始化 Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  baseURL: process.env.ANTHROPIC_BASE_URL,
});

export const llmExecutor: NodeExecutor = {
  type: NodeType.LLM,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as LLMNodeConfig;
    const variables = Object.fromEntries(context.variables);

    // 构建消息列表
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // 系统提示词（如果有）
    let systemPrompt = config.systemPrompt;
    if (systemPrompt) {
      systemPrompt = interpolateTemplate(systemPrompt, { ...variables, input });
    }

    // 用户消息
    let userContent = '';
    if (typeof input === 'string') {
      userContent = input;
    } else if (input.message || input.content || input.text) {
      userContent = input.message || input.content || input.text;
    } else {
      userContent = JSON.stringify(input);
    }

    // 处理历史消息
    if (config.messages && config.messages.length > 0) {
      for (const msg of config.messages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: interpolateTemplate(msg.content, { ...variables, input }),
        });
      }
    }

    // 添加当前用户输入
    messages.push({
      role: 'user',
      content: userContent,
    });

    // 调用 LLM
    const response = await anthropic.messages.create({
      model: config.model || 'claude-3-sonnet-20240229',
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      system: systemPrompt,
      messages,
      tools: config.tools?.map(toolName => ({
        name: toolName,
        // 这里需要根据工具名获取工具定义
        input_schema: { type: 'object', properties: {} },
      })),
    });

    // 处理响应
    const content = response.content;
    let text = '';
    let toolCalls = [];

    for (const block of content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          input: block.input,
        });
      }
    }

    return {
      text,
      toolCalls,
      usage: response.usage,
      model: response.model,
    };
  },

  validate(config: LLMNodeConfig): boolean {
    return !!config.model;
  },
};

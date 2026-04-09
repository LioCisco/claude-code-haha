/**
 * 基础节点执行器
 * START、END、INPUT、OUTPUT 等
 */

import { CanvasNode, NodeExecutor, NodeType, ExecutionContext, InputOutputConfig } from '../types';
import { interpolateTemplate } from '../utils/template';

// 开始节点
export const startExecutor: NodeExecutor = {
  type: NodeType.START,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    // 开始节点只是传递输入
    return {
      startTime: new Date().toISOString(),
      input,
    };
  },
};

// 结束节点
export const endExecutor: NodeExecutor = {
  type: NodeType.END,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as InputOutputConfig;
    const variables = Object.fromEntries(context.variables);

    let output = input;

    // 如果配置了格式化
    if (config?.format === 'json') {
      output = JSON.stringify(input, null, 2);
    }

    return {
      endTime: new Date().toISOString(),
      output,
      duration: Date.now() - new Date(context.executionHistory[0]?.startedAt || Date.now()).getTime(),
    };
  },
};

// 输入节点
export const inputExecutor: NodeExecutor = {
  type: NodeType.INPUT,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    // 输入节点暂停执行，等待用户输入
    // 实际实现中这里需要与前端交互
    return {
      waitingForInput: true,
      prompt: node.data.description || '请输入内容',
      schema: (node.data.config as InputOutputConfig)?.schema,
    };
  },
};

// 输出节点
export const outputExecutor: NodeExecutor = {
  type: NodeType.OUTPUT,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as InputOutputConfig;
    const variables = Object.fromEntries(context.variables);

    let content = input;

    // 如果配置是模板，进行插值
    if (typeof input === 'string') {
      content = interpolateTemplate(input, { ...variables, input });
    }

    // 格式化输出
    let formatted = content;
    if (config?.format === 'json' && typeof content !== 'string') {
      formatted = JSON.stringify(content, null, 2);
    }

    return {
      content: formatted,
      format: config?.format || 'text',
      timestamp: new Date().toISOString(),
    };
  },
};

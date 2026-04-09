/**
 * 代码节点执行器
 * 执行 JavaScript/TypeScript/Python 代码
 */

import { CanvasNode, NodeExecutor, NodeType, ExecutionContext, CodeNodeConfig } from '../types';
import { vm } from '../lib/sandbox';

export const codeExecutor: NodeExecutor = {
  type: NodeType.CODE,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as CodeNodeConfig;
    const variables = Object.fromEntries(context.variables);

    const code = config.code;
    const language = config.language || 'javascript';

    if (language === 'python') {
      throw new Error('Python 执行暂不支持，请使用 JavaScript');
    }

    // 创建安全的执行环境
    const sandbox = {
      input,
      vars: variables,
      console: {
        log: (...args: any[]) => {
          const step = context.executionHistory[context.executionHistory.length - 1];
          step?.logs.push(args.map(a => String(a)).join(' '));
        },
      },
      // 常用工具函数
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      Promise,
      setTimeout,
      clearTimeout,
    };

    try {
      // 使用 Function 构造器创建可执行的函数
      const func = new Function(
        'sandbox',
        `
          with (sandbox) {
            ${code}
          }
        `
      );

      const result = func(sandbox);

      return {
        result: result instanceof Promise ? await result : result,
        logs: context.executionHistory[context.executionHistory.length - 1]?.logs || [],
      };
    } catch (error) {
      throw new Error(`代码执行失败: ${error}`);
    }
  },

  validate(config: CodeNodeConfig): boolean {
    return !!config.code;
  },
};

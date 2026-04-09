/**
 * 条件分支节点执行器
 * 根据表达式决定执行哪个分支
 */

import { CanvasNode, NodeExecutor, NodeType, ExecutionContext, ConditionNodeConfig } from '../types';

export const conditionExecutor: NodeExecutor = {
  type: NodeType.CONDITION,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as ConditionNodeConfig;
    const variables = Object.fromEntries(context.variables);

    // 评估每个条件
    for (const condition of config.conditions) {
      try {
        const func = new Function('input', 'vars', `with(vars) { return ${condition.expression}; }`);
        const result = func(input, { ...variables, input });

        if (result) {
          return {
            branchId: condition.id,
            branchLabel: condition.label,
            matched: true,
            input,
          };
        }
      } catch (error) {
        console.error(`条件表达式执行失败: ${condition.expression}`, error);
      }
    }

    // 没有匹配的条件，使用默认分支
    return {
      branchId: config.defaultBranch || 'default',
      matched: false,
      input,
    };
  },

  validate(config: ConditionNodeConfig): boolean {
    return Array.isArray(config.conditions) && config.conditions.length > 0;
  },
};

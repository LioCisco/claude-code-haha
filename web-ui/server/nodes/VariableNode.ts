/**
 * 变量节点执行器
 * 设置或获取变量
 */

import { CanvasNode, NodeExecutor, NodeType, ExecutionContext, VariableNodeConfig } from '../types';
import { evaluateExpression } from '../lib/template';

export const variableSetExecutor: NodeExecutor = {
  type: NodeType.VARIABLE_SET,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as VariableNodeConfig;
    const variables = Object.fromEntries(context.variables);

    let value: any;

    switch (config.valueType) {
      case 'expression':
        value = evaluateExpression(config.expression || '', { ...variables, input });
        break;
      case 'string':
        value = String(config.variableValue);
        break;
      case 'number':
        value = Number(config.variableValue);
        break;
      case 'boolean':
        value = Boolean(config.variableValue);
        break;
      case 'object':
        value = typeof config.variableValue === 'string'
          ? JSON.parse(config.variableValue)
          : config.variableValue;
        break;
      default:
        value = config.variableValue;
    }

    // 设置变量
    context.variables.set(config.variableName, value);

    return {
      name: config.variableName,
      value,
      type: config.valueType,
    };
  },

  validate(config: VariableNodeConfig): boolean {
    return !!config.variableName;
  },
};

export const variableGetExecutor: NodeExecutor = {
  type: NodeType.VARIABLE_GET,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as VariableNodeConfig;
    const value = context.variables.get(config.variableName);

    return {
      name: config.variableName,
      value,
      exists: value !== undefined,
    };
  },

  validate(config: VariableNodeConfig): boolean {
    return !!config.variableName;
  },
};

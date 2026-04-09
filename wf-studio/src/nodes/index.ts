/**
 * 节点执行器导出与注册
 */

import { registerExecutor } from '../engine/WorkflowEngine';
import { llmExecutor } from './LLMNode';
import { mcpExecutor } from './MCPNode';
import { conditionExecutor } from './ConditionNode';
import { ragExecutor } from './RAGNode';
import { variableSetExecutor, variableGetExecutor } from './VariableNode';
import { codeExecutor } from './CodeNode';
import { startExecutor, endExecutor, inputExecutor, outputExecutor } from './BaseNodes';

// 注册所有执行器
export function registerAllExecutors(): void {
  registerExecutor(startExecutor);
  registerExecutor(endExecutor);
  registerExecutor(llmExecutor);
  registerExecutor(mcpExecutor);
  registerExecutor(conditionExecutor);
  registerExecutor(ragExecutor);
  registerExecutor(variableSetExecutor);
  registerExecutor(variableGetExecutor);
  registerExecutor(codeExecutor);
  registerExecutor(inputExecutor);
  registerExecutor(outputExecutor);
}

// 导出所有
export * from './LLMNode';
export * from './MCPNode';
export * from './ConditionNode';
export * from './RAGNode';
export * from './VariableNode';
export * from './CodeNode';
export * from './BaseNodes';

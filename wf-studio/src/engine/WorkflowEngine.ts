/**
 * 工作流执行引擎
 * 将画布工作流 JSON 映射为 claude-code 可执行结构
 */

import {
  WorkflowDefinition,
  CanvasNode,
  CanvasEdge,
  ExecutionContext,
  ExecutionResult,
  ExecutionStep,
  NodeType,
  NodeStatus,
  NodeExecutor,
} from '../types';

import { v4 as uuidv4 } from 'uuid';
import { interpolateObject } from '../utils/template';

// 节点执行器注册表
const executors = new Map<NodeType, NodeExecutor>();

export function registerExecutor(executor: NodeExecutor) {
  executors.set(executor.type, executor);
}

export class WorkflowEngine {
  private workflows = new Map<string, WorkflowDefinition>();
  private executionContexts = new Map<string, ExecutionContext>();

  // 注册工作流
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  // 从画布 JSON 创建并执行工作流
  async runWorkflowFromCanvas(workflowJson: WorkflowDefinition): Promise<ExecutionResult> {
    const runId = uuidv4();
    const startTime = Date.now();

    // 初始化执行上下文
    const context: ExecutionContext = {
      workflowId: workflowJson.id,
      runId,
      variables: new Map(),
      nodeOutputs: new Map(),
      executionHistory: [],
    };

    // 初始化变量
    for (const variable of workflowJson.variables || []) {
      context.variables.set(variable.name, variable.value);
    }

    this.executionContexts.set(runId, context);

    try {
      // 查找开始节点
      const startNode = workflowJson.nodes.find(n => n.type === NodeType.START);
      if (!startNode) {
        throw new Error('工作流必须包含 START 节点');
      }

      // 执行工作流
      const output = await this.executeNode(startNode, workflowJson, context);

      const duration = Date.now() - startTime;

      return {
        runId,
        workflowId: workflowJson.id,
        status: 'success',
        output,
        steps: context.executionHistory,
        duration,
        variables: Object.fromEntries(context.variables),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        runId,
        workflowId: workflowJson.id,
        status: 'error',
        steps: context.executionHistory,
        duration,
        variables: Object.fromEntries(context.variables),
      };
    }
  }

  // 执行单个节点
  private async executeNode(
    node: CanvasNode,
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<any> {
    const step: ExecutionStep = {
      nodeId: node.id,
      nodeType: node.type,
      status: NodeStatus.RUNNING,
      input: null,
      output: null,
      startedAt: new Date(),
      logs: [],
    };

    context.executionHistory.push(step);

    try {
      // 获取节点输入
      const input = await this.getNodeInput(node, workflow, context);
      step.input = input;

      // 获取执行器
      const executor = executors.get(node.type);
      if (!executor) {
        throw new Error(`未找到节点类型 ${node.type} 的执行器`);
      }

      // 执行节点
      const output = await executor.execute(node, input, context);
      step.output = output;
      step.status = NodeStatus.SUCCESS;
      step.endedAt = new Date();

      // 保存节点输出
      context.nodeOutputs.set(node.id, output);

      // 查找并执行下一个节点
      const nextNodes = this.getNextNodes(node, workflow, context, output);
      if (nextNodes.length > 0) {
        // 串行执行分支（并行节点特殊处理）
        for (const nextNode of nextNodes) {
          await this.executeNode(nextNode, workflow, context);
        }
      }

      return output;
    } catch (error) {
      step.status = NodeStatus.ERROR;
      step.error = error as Error;
      step.endedAt = new Date();
      throw error;
    }
  }

  // 获取节点输入
  private async getNodeInput(
    node: CanvasNode,
    workflow: WorkflowDefinition,
    context: ExecutionContext
  ): Promise<any> {
    // 查找所有入边
    const incomingEdges = workflow.edges.filter(e => e.target === node.id);

    if (incomingEdges.length === 0) {
      // 开始节点或独立节点，返回上下文变量
      return Object.fromEntries(context.variables);
    }

    if (incomingEdges.length === 1) {
      // 单输入，直接返回上游节点输出
      const sourceNode = workflow.nodes.find(n => n.id === incomingEdges[0].source);
      if (sourceNode) {
        return context.nodeOutputs.get(sourceNode.id) || {};
      }
    }

    // 多输入，合并所有上游输出
    const inputs: Record<string, any> = {};
    for (const edge of incomingEdges) {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        const output = context.nodeOutputs.get(sourceNode.id);
        if (output) {
          Object.assign(inputs, output);
        }
      }
    }

    return inputs;
  }

  // 获取下一个节点
  private getNextNodes(
    node: CanvasNode,
    workflow: WorkflowDefinition,
    context: ExecutionContext,
    output: any
  ): CanvasNode[] {
    const outgoingEdges = workflow.edges.filter(e => e.source === node.id);
    const nodes: CanvasNode[] = [];

    for (const edge of outgoingEdges) {
      // 检查条件
      if (edge.condition) {
        const variables = Object.fromEntries(context.variables);
        const conditionMet = this.evaluateCondition(edge.condition, { ...variables, input: output });
        if (!conditionMet) continue;
      }

      const targetNode = workflow.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        nodes.push(targetNode);
      }
    }

    return nodes;
  }

  // 评估条件表达式
  private evaluateCondition(expression: string, context: Record<string, any>): boolean {
    try {
      const func = new Function('context', `with(context) { return ${expression}; }`);
      return !!func(context);
    } catch {
      return false;
    }
  }

  // 获取执行上下文
  getContext(runId: string): ExecutionContext | undefined {
    return this.executionContexts.get(runId);
  }

  // 导出工作流为 JSON
  exportWorkflow(workflowId: string): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error('工作流不存在');
    return JSON.stringify(workflow, null, 2);
  }

  // 从 JSON 导入工作流
  importWorkflow(json: string): WorkflowDefinition {
    const workflow = JSON.parse(json) as WorkflowDefinition;
    this.registerWorkflow(workflow);
    return workflow;
  }
}

// 全局引擎实例
export const workflowEngine = new WorkflowEngine();

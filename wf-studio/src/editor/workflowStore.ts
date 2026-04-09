/**
 * 工作流状态管理 - 使用 Zustand
 */

import { create } from 'zustand';
import { WorkflowDefinition, ExecutionResult, WorkflowVariable } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowState {
  // 工作流信息
  workflowId: string;
  workflowName: string;
  variables: WorkflowVariable[];

  // 执行状态
  isRunning: boolean;
  lastResult: ExecutionResult | null;

  // Actions
  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  setVariables: (vars: WorkflowVariable[]) => void;
  addVariable: (variable: WorkflowVariable) => void;
  setRunning: (running: boolean) => void;
  setLastResult: (result: ExecutionResult | null) => void;
  exportWorkflow: () => WorkflowDefinition | null;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // 初始状态
  workflowId: uuidv4(),
  workflowName: '未命名工作流',
  variables: [],
  isRunning: false,
  lastResult: null,

  // Actions
  setWorkflowId: (id) => set({ workflowId: id }),

  setWorkflowName: (name) => set({ workflowName: name }),

  setVariables: (vars) => set({ variables: vars }),

  addVariable: (variable) =>
    set((state) => ({
      variables: [...state.variables, variable],
    })),

  setRunning: (running) => set({ isRunning: running }),

  setLastResult: (result) => set({ lastResult: result }),

  exportWorkflow: () => {
    // 这个函数需要与画布组件配合
    // 实际导出逻辑在画布组件中实现
    return null;
  },

  reset: () =>
    set({
      workflowId: uuidv4(),
      workflowName: '未命名工作流',
      variables: [],
      isRunning: false,
      lastResult: null,
    }),
}));

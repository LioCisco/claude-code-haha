/**
 * 工作流状态管理
 * 用于管理工作流编辑器的状态
 */

import { create } from 'zustand';
import { WorkflowVariable } from '@/types/workflow';

interface WorkflowState {
  // 工作流基本信息
  workflowId: string | null;
  workflowName: string;
  variables: WorkflowVariable[];

  // 执行状态
  isRunning: boolean;
  lastResult: any | null;

  // Actions
  setWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setVariables: (variables: WorkflowVariable[]) => void;
  addVariable: (variable: WorkflowVariable) => void;
  removeVariable: (name: string) => void;
  updateVariable: (name: string, updates: Partial<WorkflowVariable>) => void;

  setRunning: (running: boolean) => void;
  setLastResult: (result: any) => void;

  // 重置状态
  reset: () => void;
}

const initialState = {
  workflowId: null,
  workflowName: '未命名工作流',
  variables: [] as WorkflowVariable[],
  isRunning: false,
  lastResult: null,
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  ...initialState,

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setVariables: (variables) => set({ variables }),

  addVariable: (variable) =>
    set((state) => ({
      variables: [...state.variables, variable],
    })),

  removeVariable: (name) =>
    set((state) => ({
      variables: state.variables.filter((v) => v.name !== name),
    })),

  updateVariable: (name, updates) =>
    set((state) => ({
      variables: state.variables.map((v) =>
        v.name === name ? { ...v, ...updates } : v
      ),
    })),

  setRunning: (running) => set({ isRunning: running }),
  setLastResult: (result) => set({ lastResult: result }),

  reset: () => set(initialState),
}));

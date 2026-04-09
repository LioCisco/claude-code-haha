/**
 * 技能节点执行器
 * 调用平台技能或内置技能库
 */

import { NodeExecutor, NodeType, CanvasNode, ExecutionContext, SkillNodeConfig } from '../types';

export const skillExecutor: NodeExecutor = {
  type: NodeType.SKILL,

  async execute(node: CanvasNode, input: any, context: ExecutionContext): Promise<any> {
    const config = node.data.config as SkillNodeConfig;

    if (!config.skillId) {
      throw new Error('未选择技能');
    }

    const { skillSource, skillId, parameters = {} } = config;

    try {
      // 合并输入和配置的参数
      const params = {
        ...input,
        ...parameters,
      };

      if (skillSource === 'platform') {
        // 调用平台技能 API
        const response = await fetch(`http://localhost:8080/api/skills/${skillId}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '技能执行失败');
        }

        const result = await response.json();
        return result.result || result;
      } else {
        // 内置技能库 - 调用 Claude Skills API
        // 注意：内置技能需要通过 Claude Code CLI 执行
        // 这里返回提示信息，实际执行需要在工作流引擎中集成 CLI 调用
        const response = await fetch(`http://localhost:8080/api/claude-skills/${skillId}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '内置技能执行失败');
        }

        const result = await response.json();
        return result.result || result;
      }
    } catch (error) {
      console.error('技能节点执行失败:', error);
      throw error;
    }
  },

  validate(config: SkillNodeConfig): boolean {
    return !!(config.skillId && config.skillSource);
  },
};

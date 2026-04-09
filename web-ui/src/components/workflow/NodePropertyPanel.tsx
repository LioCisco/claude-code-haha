/**
 * 节点属性面板 - 编辑选中节点的配置
 */

import React from 'react';
import { Node } from 'reactflow';
import { NodeType, LLMNodeConfig, MCPNodeConfig, ConditionNodeConfig, RAGNodeConfig, VariableNodeConfig, CodeNodeConfig, SkillNodeConfig } from '@/types/workflow';

interface NodePropertyPanelProps {
  selectedNode: Node | null;
  onNodeDataChange: (nodeId: string, data: any) => void;
}

export function NodePropertyPanel({ selectedNode, onNodeDataChange }: NodePropertyPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <p className="text-gray-500 text-center">选择一个节点编辑属性</p>
      </div>
    );
  }

  const { data, type, id } = selectedNode;
  const config = data.config || {};

  const updateConfig = (newConfig: any) => {
    onNodeDataChange(id, { config: { ...config, ...newConfig } });
  };

  const updateData = (updates: any) => {
    onNodeDataChange(id, updates);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">节点属性</h2>
        <p className="text-xs text-gray-500">{type}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* 通用属性 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
          <input
            type="text"
            value={data.label || ''}
            onChange={(e) => updateData({ label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea
            value={data.description || ''}
            onChange={(e) => updateData({ description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 类型特定配置 */}
        {type === NodeType.LLM && (
          <LLMConfigPanel config={config as LLMNodeConfig} onChange={updateConfig} />
        )}

        {type === NodeType.MCP_TOOL && (
          <MCPConfigPanel config={config as MCPNodeConfig} onChange={updateConfig} />
        )}

        {type === NodeType.CONDITION && (
          <ConditionConfigPanel config={config as ConditionNodeConfig} onChange={updateConfig} />
        )}

        {type === NodeType.RAG_RETRIEVE && (
          <RAGConfigPanel config={config as RAGNodeConfig} onChange={updateConfig} />
        )}

        {type === NodeType.VARIABLE_SET && (
          <VariableConfigPanel config={config as VariableNodeConfig} onChange={updateConfig} />
        )}

        {type === NodeType.CODE && (
          <CodeConfigPanel config={config as CodeNodeConfig} onChange={updateConfig} />
        )}

        {type === NodeType.SKILL && (
          <SkillConfigPanel config={config as SkillNodeConfig} onChange={updateConfig} />
        )}
      </div>
    </div>
  );
}

// LLM 节点配置面板
function LLMConfigPanel({ config, onChange }: { config: LLMNodeConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
        <select
          value={config.model || 'claude-3-sonnet-20240229'}
          onChange={(e) => onChange({ model: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="claude-3-opus-20240229">Claude 3 Opus</option>
          <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
          <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">系统提示词</label>
        <textarea
          value={config.systemPrompt || ''}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          rows={4}
          placeholder="输入系统提示词..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">温度 ({config.temperature ?? 0.7})</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature ?? 0.7}
          onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">最大 Token</label>
        <input
          type="number"
          value={config.maxTokens || 4096}
          onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
}

// MCP 节点配置面板
function MCPConfigPanel({ config, onChange }: { config: MCPNodeConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">服务名称</label>
        <input
          type="text"
          value={config.serverName || ''}
          onChange={(e) => onChange({ serverName: e.target.value })}
          placeholder="例如: filesystem"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">工具名称</label>
        <input
          type="text"
          value={config.toolName || ''}
          onChange={(e) => onChange({ toolName: e.target.value })}
          placeholder="例如: read_file"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">参数 (JSON)</label>
        <textarea
          value={JSON.stringify(config.parameters || {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ parameters: JSON.parse(e.target.value) });
            } catch {}
          }}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">超时 (ms)</label>
        <input
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => onChange({ timeout: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
}

// 条件节点配置面板
function ConditionConfigPanel({ config, onChange }: { config: ConditionNodeConfig; onChange: (c: any) => void }) {
  const addCondition = () => {
    const newCondition = {
      id: `branch_${Date.now()}`,
      label: `分支 ${config.conditions.length + 1}`,
      expression: 'true',
    };
    onChange({ conditions: [...config.conditions, newCondition] });
  };

  const updateCondition = (index: number, updates: any) => {
    const newConditions = [...config.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    const newConditions = config.conditions.filter((_, i) => i !== index);
    onChange({ conditions: newConditions });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">条件分支</label>
        <button
          onClick={addCondition}
          className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + 添加
        </button>
      </div>

      {config.conditions.map((condition, index) => (
        <div key={condition.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
          <input
            type="text"
            value={condition.label}
            onChange={(e) => updateCondition(index, { label: e.target.value })}
            placeholder="分支名称"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            value={condition.expression}
            onChange={(e) => updateCondition(index, { expression: e.target.value })}
            placeholder="表达式，如: input.age > 18"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
          />
          {index > 0 && (
            <button
              onClick={() => removeCondition(index)}
              className="text-xs text-red-500 hover:text-red-700"
            >
              删除
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// RAG 节点配置面板
function RAGConfigPanel({ config, onChange }: { config: RAGNodeConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">知识库 ID</label>
        <input
          type="text"
          value={config.knowledgeBaseId || ''}
          onChange={(e) => onChange({ knowledgeBaseId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">查询</label>
        <textarea
          value={config.query || ''}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="支持 {{variable}} 语法"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">返回数量 (Top K)</label>
        <input
          type="number"
          value={config.topK || 5}
          onChange={(e) => onChange({ topK: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">相似度阈值</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.threshold || 0.5}
          onChange={(e) => onChange({ threshold: parseFloat(e.target.value) })}
          className="w-full"
        />
        <span className="text-xs text-gray-500">{config.threshold || 0.5}</span>
      </div>
    </div>
  );
}

// 变量节点配置面板
function VariableConfigPanel({ config, onChange }: { config: VariableNodeConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">变量名</label>
        <input
          type="text"
          value={config.variableName || ''}
          onChange={(e) => onChange({ variableName: e.target.value })}
          placeholder="例如: userName"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
        <select
          value={config.valueType || 'string'}
          onChange={(e) => onChange({ valueType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="string">字符串</option>
          <option value="number">数字</option>
          <option value="boolean">布尔值</option>
          <option value="object">对象</option>
          <option value="expression">表达式</option>
        </select>
      </div>

      {config.valueType === 'expression' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">表达式</label>
          <input
            type="text"
            value={config.expression || ''}
            onChange={(e) => onChange({ expression: e.target.value })}
            placeholder="例如: input.name + '!'"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">值</label>
          <input
            type="text"
            value={config.variableValue || ''}
            onChange={(e) => onChange({ variableValue: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

// 代码节点配置面板
function CodeConfigPanel({ config, onChange }: { config: CodeNodeConfig; onChange: (c: any) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">语言</label>
        <select
          value={config.language || 'javascript'}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python" disabled>Python (暂不支持)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
        <textarea
          value={config.code || ''}
          onChange={(e) => onChange({ code: e.target.value })}
          rows={12}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
          placeholder={`// 输入通过 input 变量访问
// 上下文变量通过 vars 访问

console.log('输入:', input);

// 返回结果
return {
  processed: input,
  timestamp: Date.now()
};`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">超时 (ms)</label>
        <input
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => onChange({ timeout: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
}

// 技能节点配置面板
function SkillConfigPanel({ config, onChange }: { config: SkillNodeConfig; onChange: (c: any) => void }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [platformSkills, setPlatformSkills] = React.useState<Array<{ id: string; name: string; description: string }>>([]);
  const [builtinSkills, setBuiltinSkills] = React.useState<Array<{ id: string; name: string; description: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // 加载技能列表
  React.useEffect(() => {
    const loadSkills = async () => {
      setIsLoading(true);
      try {
        // 加载平台技能
        const platformRes = await fetch('/api/skills');
        if (platformRes.ok) {
          const data = await platformRes.json();
          setPlatformSkills(data.skills?.map((s: any) => ({ id: s.id, name: s.name, description: s.description })) || []);
        }

        // 加载内置技能
        const builtinRes = await fetch('/api/claude-skills');
        if (builtinRes.ok) {
          const data = await builtinRes.json();
          setBuiltinSkills(data.skills?.map((s: any) => ({ id: s.id, name: s.name, description: s.description })) || []);
        }
      } catch (error) {
        console.error('加载技能列表失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSkills();
  }, []);

  const handleSelectSkill = (skill: { id: string; name: string }, source: 'platform' | 'builtin') => {
    onChange({
      skillSource: source,
      skillId: skill.id,
      skillName: skill.name,
    });
  };

  const filteredPlatformSkills = platformSkills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBuiltinSkills = builtinSkills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* 技能来源选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">技能来源</label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ skillSource: 'platform', skillId: '', skillName: '' })}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
              config.skillSource === 'platform'
                ? 'bg-accio-50 border-accio-500 text-accio-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            平台技能
          </button>
          <button
            onClick={() => onChange({ skillSource: 'builtin', skillId: '', skillName: '' })}
            className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
              config.skillSource === 'builtin'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            内置技能库
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">搜索技能</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="输入技能名称..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accio-500 focus:border-accio-500"
        />
      </div>

      {/* 已选技能 */}
      {config.skillId && (
        <div className="p-3 bg-accio-50 border border-accio-200 rounded-lg">
          <span className="text-xs text-accio-600 font-medium">已选择</span>
          <p className="font-medium text-accio-800">{config.skillName}</p>
          <p className="text-xs text-accio-600">{config.skillSource === 'platform' ? '平台技能' : '内置技能库'}</p>
        </div>
      )}

      {/* 技能列表 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">加载中...</div>
        ) : (
          <>
            {/* 平台技能列表 */}
            {config.skillSource === 'platform' && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">平台技能 ({filteredPlatformSkills.length})</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredPlatformSkills.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">暂无匹配的平台技能</p>
                  ) : (
                    filteredPlatformSkills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => handleSelectSkill(skill, 'platform')}
                        className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                          config.skillId === skill.id
                            ? 'bg-accio-100 text-accio-800 border border-accio-300'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="font-medium">{skill.name}</span>
                        <p className="text-xs text-gray-500 truncate">{skill.description}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 内置技能列表 */}
            {config.skillSource === 'builtin' && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">内置技能库 ({filteredBuiltinSkills.length})</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredBuiltinSkills.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">暂无匹配的内置技能</p>
                  ) : (
                    filteredBuiltinSkills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => handleSelectSkill(skill, 'builtin')}
                        className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                          config.skillId === skill.id
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="font-medium">/{skill.name}</span>
                        <p className="text-xs text-gray-500 truncate">{skill.description}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 参数配置 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">参数 (JSON)</label>
        <textarea
          value={JSON.stringify(config.parameters || {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ parameters: JSON.parse(e.target.value) });
            } catch {}
          }}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
          placeholder='{"key": "value"}'
        />
      </div>
    </div>
  );
}

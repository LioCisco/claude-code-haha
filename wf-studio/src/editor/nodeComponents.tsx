/**
 * 节点组件工厂
 * 为不同类型的节点创建可视化组件
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeType } from '../types';

interface NodeComponentOptions {
  color: string;
  icon: string;
}

export function createNodeComponent(
  type: string,
  options: NodeComponentOptions
): React.FC<NodeProps> {
  return memo(({ data, selected }) => {
    const isStart = type === NodeType.START;
    const isEnd = type === NodeType.END;

    return (
      <div
        className={`
          min-w-[140px] px-4 py-3 rounded-lg border-2 shadow-sm transition-all
          ${selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
        `}
        style={{
          backgroundColor: 'white',
          borderColor: options.color,
        }}
      >
        {/* 输入连接点 */}
        {!isStart && (
          <Handle
            type="target"
            position={Position.Left}
            style={{ background: options.color, width: 10, height: 10 }}
          />
        )}

        <div className="flex items-center gap-2">
          <span className="text-lg">{options.icon}</span>
          <div className="flex flex-col">
            <span className="font-medium text-sm text-gray-800">{data.label}</span>
            {data.description && (
              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                {data.description}
              </span>
            )}
          </div>
        </div>

        {/* 输出连接点 */}
        {!isEnd && (
          <Handle
            type="source"
            position={Position.Right}
            style={{ background: options.color, width: 10, height: 10 }}
          />
        )}

        {/* 条件分支的特殊输出 */}
        {type === NodeType.CONDITION && data.config?.conditions && (
          <>
            {data.config.conditions.map((cond: any, index: number) => (
              <Handle
                key={cond.id}
                type="source"
                position={Position.Right}
                id={cond.id}
                style={{
                  background: '#f59e0b',
                  width: 10,
                  height: 10,
                  top: `${50 + index * 20}%`,
                }}
              />
            ))}
          </>
        )}
      </div>
    );
  });
}

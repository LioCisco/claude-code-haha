/**
 * 工作流工具栏 - 运行、保存、导出、导入
 */

import React, { useRef } from 'react';
import { Play, Save, Download, Upload, Loader2 } from 'lucide-react';

interface WorkflowToolbarProps {
  onRun: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  isRunning: boolean;
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
}

export function WorkflowToolbar({
  onRun,
  onSave,
  onExport,
  onImport,
  isRunning,
  workflowName,
  onWorkflowNameChange,
}: WorkflowToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={workflowName}
          onChange={(e) => onWorkflowNameChange(e.target.value)}
          placeholder="未命名工作流"
          className="font-semibold text-lg bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded px-2 -ml-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleImportClick}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Upload className="w-4 h-4" />
          导入
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          导出
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Save className="w-4 h-4" />
          保存
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-accio-500 to-accio-600 rounded-lg hover:from-accio-600 hover:to-accio-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              运行中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              运行
            </>
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

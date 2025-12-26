'use client'

import { useState } from 'react'
import { Terminal, Eye, FolderTree, Circle } from 'lucide-react'

export type TerminalLine = {
  id: string
  type: 'command' | 'stdout' | 'stderr' | 'system'
  content: string
  timestamp: Date
}

type OutputPanelProps = {
  lines: TerminalLine[]
  sandboxStatus: 'disconnected' | 'connecting' | 'active' | 'error'
  previewUrl?: string
  fileTree?: string[]
}

export function OutputPanel({
  lines,
  sandboxStatus,
  previewUrl,
  fileTree,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview' | 'files'>('terminal')

  const getStatusColor = () => {
    switch (sandboxStatus) {
      case 'active':
        return 'bg-jam-success'
      case 'connecting':
        return 'bg-yellow-500 animate-pulse'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-jam-claude'
      case 'stderr':
        return 'text-red-600'
      case 'system':
        return 'text-gray-500'
      default:
        return 'text-gray-700'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b border-jam-border">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              activeTab === 'terminal'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              activeTab === 'preview'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              activeTab === 'files'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            Files
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Circle className={`w-2 h-2 ${getStatusColor()}`} fill="currentColor" />
          <span className="text-xs text-gray-500 capitalize">{sandboxStatus}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && (
          <div className="h-full overflow-y-auto p-4 terminal-output bg-gray-50">
            {lines.length === 0 ? (
              <div className="text-gray-500">
                <span className="text-gray-400">$</span> Sandbox ready. Waiting for commands...
              </div>
            ) : (
              lines.map((line) => (
                <div key={line.id} className={`${getLineColor(line.type)}`}>
                  {line.type === 'command' && <span className="text-gray-400">$ </span>}
                  {line.content}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full flex items-center justify-center bg-gray-50">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full border-0" title="Preview" />
            ) : (
              <div className="text-gray-500 text-sm">
                No preview available. Run a dev server to see output here.
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="h-full overflow-y-auto p-4 bg-gray-50">
            {fileTree && fileTree.length > 0 ? (
              <ul className="space-y-1 text-sm font-mono">
                {fileTree.map((file, i) => (
                  <li key={i} className="text-gray-600 hover:text-gray-900">{file}</li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 text-sm">
                No files yet. Start building to see the file tree.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
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
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500 animate-pulse'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = () => {
    switch (sandboxStatus) {
      case 'active':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Error'
      default:
        return 'Disconnected'
    }
  }

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-amber-600'
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
      {/* Header row - matches BrainPanel h-12 */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'terminal'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Terminal className="w-3 h-3" />
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FolderTree className="w-3 h-3" />
            Files
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <Circle className={`w-2 h-2 ${getStatusColor()}`} fill="currentColor" />
          <span className="text-[11px] text-gray-500">{getStatusText()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && (
          <div className="h-full overflow-y-auto bg-gray-50 p-3 font-mono text-xs">
            {lines.length === 0 ? (
              <p className="text-gray-400">$ Sandbox ready. Waiting for commands...</p>
            ) : (
              lines.map((line) => (
                <div key={line.id} className={`${getLineColor(line.type)} leading-relaxed`}>
                  {line.type === 'command' ? `$ ${line.content}` : line.content}
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
              <p className="text-xs text-gray-400">No preview available</p>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="h-full overflow-y-auto bg-gray-50 p-3">
            {fileTree && fileTree.length > 0 ? (
              <ul className="space-y-1">
                {fileTree.map((file, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <FolderTree className="w-3 h-3 text-gray-400" />
                    {file}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">No files yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
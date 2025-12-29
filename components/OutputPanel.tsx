'use client'
import { useState } from 'react'
import { Terminal, Eye, FolderTree, Circle, Download, X, FileText, FileCode, FileImage } from 'lucide-react'

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
  sandboxId?: string
  onReadFile?: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>
}

// Determine file icon based on extension
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'json', 'yaml', 'yml', 'toml', 'xml']
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico']
  
  if (codeExts.includes(ext || '')) return <FileCode className="w-3 h-3 text-blue-500" />
  if (imageExts.includes(ext || '')) return <FileImage className="w-3 h-3 text-purple-500" />
  return <FileText className="w-3 h-3 text-gray-400" />
}

// Check if file is viewable as text
function isTextFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  const textExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'json', 'yaml', 'yml', 'toml', 'xml', 'html', 'htm', 'md', 'txt', 'sh', 'bash', 'zsh', 'env', 'gitignore', 'dockerfile']
  return textExts.includes(ext || '') || !filename.includes('.')
}

export function OutputPanel({
  lines,
  sandboxStatus,
  previewUrl,
  fileTree,
  sandboxId,
  onReadFile,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview' | 'files'>('terminal')
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string } | null>(null)
  const [loadingFile, setLoadingFile] = useState<string | null>(null)

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

  const handleFileClick = async (filename: string) => {
    if (!onReadFile || !isTextFile(filename)) return
    
    setLoadingFile(filename)
    const result = await onReadFile(filename)
    setLoadingFile(null)
    
    if (result.success && result.content) {
      setViewingFile({ path: filename, content: result.content })
    }
  }

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
            } ${previewUrl ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
          >
            <Eye className="w-3 h-3" />
            Preview
            {previewUrl && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
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
          <div className="h-full flex flex-col bg-gray-50">
            {previewUrl ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200">
                  <a 
                    href={previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline truncate"
                  >
                    {previewUrl}
                  </a>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                  >
                    Open ↗
                  </a>
                </div>
                <iframe 
                  src={previewUrl} 
                  className="flex-1 w-full border-0" 
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Eye className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">No preview available</p>
                <p className="text-[10px] mt-1">Start a dev server to see your app</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="h-full overflow-y-auto bg-gray-50 p-3">
            {/* File Viewer Modal */}
            {viewingFile && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-900">{viewingFile.path}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(viewingFile.path, viewingFile.content)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setViewingFile(null)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="Close"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <pre className="flex-1 overflow-auto p-4 text-xs font-mono bg-gray-50 text-gray-800">
                    {viewingFile.content}
                  </pre>
                </div>
              </div>
            )}

            {fileTree && fileTree.length > 0 ? (
              <ul className="space-y-1">
                {fileTree.map((file, i) => (
                  <li 
                    key={i} 
                    className={`flex items-center justify-between gap-2 text-xs text-gray-700 p-1.5 rounded ${
                      isTextFile(file) && onReadFile ? 'hover:bg-gray-100 cursor-pointer' : ''
                    } ${loadingFile === file ? 'bg-gray-100' : ''}`}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(file)}
                      <span className={loadingFile === file ? 'text-gray-400' : ''}>
                        {file}
                      </span>
                      {loadingFile === file && (
                        <span className="text-[10px] text-gray-400">Loading...</span>
                      )}
                    </div>
                    {isTextFile(file) && onReadFile && (
                      <span className="text-[10px] text-gray-400">Click to view</span>
                    )}
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
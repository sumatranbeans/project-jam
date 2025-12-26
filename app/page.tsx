'use client'

import { useState, useCallback } from 'react'
import { BrainPanel, type Message } from '@/components/BrainPanel'
import { OutputPanel, type TerminalLine } from '@/components/OutputPanel'
import { CommandBar } from '@/components/CommandBar'
import { StatusIndicator, type AgentStatus } from '@/components/StatusIndicator'
import { startSandboxAction, runCommandAction, listFilesAction } from './actions'
import { Zap } from 'lucide-react'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [sandboxId, setSandboxId] = useState<string | null>(null)
  const [sandboxStatus, setSandboxStatus] = useState<'disconnected' | 'connecting' | 'active' | 'error'>('disconnected')
  const [fileTree, setFileTree] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const addMessage = useCallback((role: Message['role'], content: string) => {
    const newMessage: Message = { id: crypto.randomUUID(), role, content, timestamp: new Date() }
    setMessages((prev) => [...prev, newMessage])
  }, [])

  const addTerminalLine = useCallback((type: TerminalLine['type'], content: string) => {
    const newLine: TerminalLine = { id: crypto.randomUUID(), type, content, timestamp: new Date() }
    setTerminalLines((prev) => [...prev, newLine])
  }, [])

  const connectSandbox = async () => {
    setSandboxStatus('connecting')
    addTerminalLine('system', 'Connecting to E2B sandbox...')
    try {
      const session = await startSandboxAction()
      setSandboxId(session.sandboxId)
      setSandboxStatus('active')
      addTerminalLine('system', `Connected to sandbox: ${session.sandboxId}`)
      const filesResult = await listFilesAction(session.sandboxId)
      if (filesResult.files) setFileTree(filesResult.files)
    } catch (error) {
      setSandboxStatus('error')
      addTerminalLine('stderr', `Failed to connect: ${error}`)
    }
  }

  const runCommand = async (command: string) => {
    if (!sandboxId) {
      addTerminalLine('stderr', 'No sandbox connected')
      return
    }
    addTerminalLine('command', command)
    try {
      const result = await runCommandAction(sandboxId, command)
      if (result.stdout) result.stdout.split('\n').forEach((line) => { if (line.trim()) addTerminalLine('stdout', line) })
      if (result.stderr) result.stderr.split('\n').forEach((line) => { if (line.trim()) addTerminalLine('stderr', line) })
      const filesResult = await listFilesAction(sandboxId)
      if (filesResult.files) setFileTree(filesResult.files)
      return result
    } catch (error) {
      addTerminalLine('stderr', `Command failed: ${error}`)
    }
  }

  const handleUserMessage = async (message: string) => {
    setIsProcessing(true)
    addMessage('user', message)
    if (!sandboxId) {
      setStatus('executing')
      await connectSandbox()
    }
    setStatus('claude-coding')
    addMessage('claude', `I'll help you with: "${message}"\n\nLet me set up the environment...`)
    await runCommand('echo "Sandbox is ready!" && node --version && npm --version')
    setStatus('gemini-auditing')
    addMessage('gemini', 'I\'ve reviewed the setup. The sandbox environment is configured correctly with Node.js and npm available. Ready to proceed with development.')
    setStatus('complete')
    setIsProcessing(false)
  }

  return (
    <main className="flex flex-col h-screen bg-jam-bg">
      <header className="flex items-center justify-between px-6 py-4 border-b border-jam-border bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-jam-claude to-jam-gemini">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Project Jam</h1>
            <p className="text-xs text-gray-500">Claude builds • Gemini supervises</p>
          </div>
        </div>
        <StatusIndicator status={status} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-jam-border overflow-hidden">
          <BrainPanel
            messages={messages}
            status={status === 'idle' ? 'Waiting for input' : status === 'claude-coding' ? 'Claude is thinking...' : status === 'gemini-auditing' ? 'Gemini is reviewing...' : 'Processing...'}
          />
        </div>
        <div className="w-1/2 overflow-hidden">
          <OutputPanel lines={terminalLines} sandboxStatus={sandboxStatus} fileTree={fileTree} />
        </div>
      </div>

      <CommandBar
        onSubmit={handleUserMessage}
        disabled={isProcessing}
        placeholder={sandboxId ? 'Describe what you want to build...' : 'Type to connect sandbox and start building...'}
      />
    </main>
  )
}
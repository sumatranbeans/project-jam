'use client'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import { BrainPanel, type Message } from '@/components/BrainPanel'
import { OutputPanel, type TerminalLine } from '@/components/OutputPanel'
import { CommandBar } from '@/components/CommandBar'
import { StatusIndicator, type AgentStatus } from '@/components/StatusIndicator'
import { startSandboxAction, runCommandAction, listFilesAction } from './actions'
import { checkOnboardingAction } from './vault-actions'
import { Zap, LogOut, Settings } from 'lucide-react'

export default function Home() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
  const [sandboxId, setSandboxId] = useState<string | null>(null)
  const [sandboxStatus, setSandboxStatus] = useState<'disconnected' | 'connecting' | 'active' | 'error'>('disconnected')
  const [fileTree, setFileTree] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    if (isLoaded && user) { checkOnboarding() }
  }, [isLoaded, user])

  const checkOnboarding = async () => {
    try {
      const { completed } = await checkOnboardingAction()
      if (completed === false) { router.push('/onboarding') }
    } catch (error) {
      console.error('Failed to check onboarding:', error)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  const addMessage = useCallback((role: Message['role'], content: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content, timestamp: new Date() }])
  }, [])

  const addTerminalLine = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines((prev) => [...prev, { id: crypto.randomUUID(), type, content, timestamp: new Date() }])
  }, [])

  const connectSandbox = async () => {
    setSandboxStatus('connecting')
    addTerminalLine('system', 'Connecting to E2B sandbox...')
    try {
      const sbSession = await startSandboxAction()
      setSandboxId(sbSession.sandboxId)
      setSandboxStatus('active')
      addTerminalLine('system', 'Connected to sandbox: ' + sbSession.sandboxId)
      const filesResult = await listFilesAction(sbSession.sandboxId)
      if (filesResult.files) setFileTree(filesResult.files)
    } catch (error) {
      setSandboxStatus('error')
      addTerminalLine('stderr', 'Failed to connect: ' + error)
    }
  }

  const runCommand = async (command: string) => {
    if (sandboxId === null) { addTerminalLine('stderr', 'No sandbox connected'); return }
    addTerminalLine('command', command)
    try {
      const result = await runCommandAction(sandboxId, command)
      if (result.stdout) result.stdout.split('\n').forEach((line) => { if (line.trim()) addTerminalLine('stdout', line) })
      if (result.stderr) result.stderr.split('\n').forEach((line) => { if (line.trim()) addTerminalLine('stderr', line) })
      const filesResult = await listFilesAction(sandboxId)
      if (filesResult.files) setFileTree(filesResult.files)
      return result
    } catch (error) {
      addTerminalLine('stderr', 'Command failed: ' + error)
    }
  }

  const handleUserMessage = async (message: string) => {
    setIsProcessing(true)
    addMessage('user', message)
    if (sandboxId === null) { setAgentStatus('executing'); await connectSandbox() }
    setAgentStatus('claude-coding')
    addMessage('claude', 'I will help you with: "' + message + '"\n\nLet me set up the environment...')
    await runCommand('echo "Sandbox is ready!" && node --version && npm --version')
    setAgentStatus('gemini-auditing')
    addMessage('gemini', 'I have reviewed the setup. The sandbox environment is configured correctly with Node.js and npm available. Ready to proceed.')
    setAgentStatus('complete')
    setIsProcessing(false)
  }

  if (isLoaded === false || checkingOnboarding) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>
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
            <p className="text-xs text-gray-500">Claude builds - Gemini supervises</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusIndicator status={agentStatus} />
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
            <button onClick={() => router.push('/settings')} className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <SignOutButton>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-jam-border overflow-hidden">
          <BrainPanel messages={messages} status={agentStatus === 'idle' ? 'Waiting for input' : agentStatus === 'claude-coding' ? 'Claude is thinking...' : agentStatus === 'gemini-auditing' ? 'Gemini is reviewing...' : 'Processing...'} />
        </div>
        <div className="w-1/2 overflow-hidden">
          <OutputPanel lines={terminalLines} sandboxStatus={sandboxStatus} fileTree={fileTree} />
        </div>
      </div>
      <CommandBar onSubmit={handleUserMessage} disabled={isProcessing} placeholder={sandboxId ? 'Describe what you want to build...' : 'Type to connect sandbox and start building...'} />
    </main>
  )
}
'use client'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect } from 'react'
import { BrainPanel, type Message } from '@/components/BrainPanel'
import { OutputPanel, type TerminalLine } from '@/components/OutputPanel'
import { CommandBar } from '@/components/CommandBar'
import { StatusIndicator, type AgentStatus } from '@/components/StatusIndicator'
import { startSandboxAction, listFilesAction, orchestrateAction, executeActionsAction } from './actions'
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
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const handleCancel = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    setIsProcessing(false)
    setAgentStatus('idle')
    addTerminalLine('system', '⚠️ Operation cancelled by user')
  }

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

  const addMessage = useCallback((role: Message['role'], content: string, extra?: { thinking?: string; approved?: boolean }) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content, timestamp: new Date(), ...extra }])
  }, [])

  const addTerminalLine = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines((prev) => [...prev, { id: crypto.randomUUID(), type, content, timestamp: new Date() }])
  }, [])

  const connectSandbox = async (): Promise<string | null> => {
    setSandboxStatus('connecting')
    addTerminalLine('system', 'Connecting to E2B sandbox...')
    try {
      const sbSession = await startSandboxAction()
      setSandboxId(sbSession.sandboxId)
      setSandboxStatus('active')
      addTerminalLine('system', 'Connected to sandbox: ' + sbSession.sandboxId)
      const filesResult = await listFilesAction(sbSession.sandboxId)
      if (filesResult.files) setFileTree(filesResult.files)
      return sbSession.sandboxId
    } catch (error) {
      setSandboxStatus('error')
      addTerminalLine('stderr', 'Failed to connect: ' + error)
      return null
    }
  }

  const handleUserMessage = async (message: string) => {
  setIsProcessing(true)
  addMessage('user', message)
  
  let currentSandboxId = sandboxId
  if (currentSandboxId === null) {
    setAgentStatus('executing')
    currentSandboxId = await connectSandbox()
  }
  
  if (currentSandboxId === null) {
    addMessage('system', 'Failed to connect to sandbox')
    setIsProcessing(false)
    return
  }

  try {
    // Phase 1: Architect assesses first
    setAgentStatus('gemini-auditing')
    addTerminalLine('system', 'Product Architect analyzing request...')
    
    const result = await orchestrateAction(message, currentSandboxId)
    
    // If Architect needs clarification - only Architect speaks
    if (result.phase === 'clarification' && result.architectResponse?.needsClarification) {
      addMessage('gemini', result.architectResponse.clarificationQuestion || 'Could you clarify what you would like to build?')
      setAgentStatus('idle')
      setIsProcessing(false)
      return
    }
    
    // If there's a spec from Architect, show it
    if (result.architectResponse?.spec) {
      addMessage('gemini', `Here's my understanding:\n\n${result.architectResponse.spec}\n\nHanding off to Engineering Lead...`, { thinking: 'Creating technical specification' })
    }

    // Phase 2: Show Builder's work
    if (result.builderPlan) {
      setAgentStatus('claude-coding')
      addTerminalLine('system', 'Engineering Lead building...')
      addMessage('claude', result.builderPlan.response, { thinking: result.builderPlan.thinking })
    }
    
    // Phase 3: Show Architect's review ONLY if there were actions and review was substantive
    if (result.phase === 'complete' && result.architectResponse?.reviewNeeded !== false) {
      setAgentStatus('gemini-auditing')
      addTerminalLine('system', 'Product Architect reviewing...')
      addMessage('gemini', result.architectResponse?.reasoning || 'Approved', { approved: result.approved })
      
      if (result.architectResponse?.concerns && result.architectResponse.concerns.length > 0) {
        addTerminalLine('system', 'Concerns: ' + result.architectResponse.concerns.join(', '))
      }
    }

    // Execute if approved
    if (result.approved && result.finalActions.length > 0) {
      setAgentStatus('executing')
      addTerminalLine('system', 'Executing approved actions...')
      
      const execResults = await executeActionsAction(currentSandboxId, result.finalActions)
      
      for (const execResult of execResults) {
        if (execResult.success) {
          addTerminalLine('stdout', `✓ ${execResult.action}`)
          if (execResult.output) addTerminalLine('stdout', execResult.output)
        } else {
          addTerminalLine('stderr', `✗ ${execResult.action}: ${execResult.output}`)
        }
      }
      
      // Refresh file tree
      const filesResult = await listFilesAction(currentSandboxId)
      if (filesResult.files) setFileTree(filesResult.files)
    }

    setAgentStatus('complete')
  } catch (error) {
    addTerminalLine('stderr', 'Orchestration failed: ' + error)
    addMessage('system', 'Something went wrong. Check the terminal for details.')
    setAgentStatus('idle')
  }

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
        <div className="w-[70%] border-r border-jam-border overflow-hidden">
          <BrainPanel messages={messages} status={agentStatus === 'idle' ? 'Waiting for input' : agentStatus === 'claude-coding' ? 'Builder is thinking...' : agentStatus === 'gemini-auditing' ? 'Supervisor is reviewing...' : agentStatus === 'executing' ? 'Executing actions...' : 'Processing...'} />
        </div>
        <div className="w-[30%] overflow-hidden">
          <OutputPanel lines={terminalLines} sandboxStatus={sandboxStatus} fileTree={fileTree} />
        </div>
      </div>
      <CommandBar 
        onSubmit={handleUserMessage} 
        onCancel={handleCancel}
        disabled={isProcessing} 
        isProcessing={isProcessing} 
        placeholder={sandboxId ? 'Describe what you want to build...' : 'Type to connect sandbox and start building...'} 
      />
    </main>
  )
}
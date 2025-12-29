'use client'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'
import { BrainPanel, type Message } from '@/components/BrainPanel'
import { OutputPanel, type TerminalLine } from '@/components/OutputPanel'
import { CommandBar } from '@/components/CommandBar'
import { StatusIndicator, type AgentStatus } from '@/components/StatusIndicator'
import { 
  startSandboxAction, 
  listFilesAction, 
  orchestrateAction, 
  executeActionsAction, 
  orchestrateFixAction,
  purgeDirectoryAction,
  fullResetAction
} from './actions'
import { checkOnboardingAction } from './vault-actions'
import { Zap, LogOut, Settings } from 'lucide-react'

const MAX_FIX_ATTEMPTS = 3
const MAX_SILENT_RETRIES = 2

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
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
  const currentIntentRef = useRef<string>('')
  const silentRetryCountRef = useRef<number>(0)
  const issuesResolvedRef = useRef<number>(0)
  const reflexMessageIdRef = useRef<string | null>(null)

  const handleCancel = () => {
    setIsProcessing(false)
    setAgentStatus('idle')
    addTerminalLine('system', '⚠️ Operation cancelled by Director')
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

  const addMessage = useCallback((role: Message['role'], content: string, extra?: { thinking?: string; approved?: boolean; attemptNumber?: number }) => {
    const id = crypto.randomUUID()
    setMessages(prev => [...prev, { id, role, content, timestamp: new Date(), ...extra }])
    return id
  }, [])

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  const updateMessage = useCallback((id: string, content: string, extra?: { attemptNumber?: number }) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content, ...extra } : m))
  }, [])

  const addTerminalLine = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines(prev => [...prev, { id: crypto.randomUUID(), type, content, timestamp: new Date() }])
  }, [])

  const connectSandbox = async (): Promise<string | null> => {
    setSandboxStatus('connecting')
    addTerminalLine('system', 'Connecting to E2B sandbox...')
    try {
      const sbSession = await startSandboxAction()
      setSandboxId(sbSession.sandboxId)
      setSandboxStatus('active')
      addTerminalLine('system', `Connected: ${sbSession.sandboxId}`)
      const filesResult = await listFilesAction(sbSession.sandboxId)
      if (filesResult.files) setFileTree(filesResult.files)
      return sbSession.sandboxId
    } catch (error) {
      setSandboxStatus('error')
      addTerminalLine('stderr', 'Connection failed: ' + error)
      return null
    }
  }

  const refreshFileTree = async (sbId: string) => {
    const filesResult = await listFilesAction(sbId)
    if (filesResult.files) setFileTree(filesResult.files)
  }

  // Generate E2B preview URL
  const getPreviewUrl = (sbId: string, port: number = 5173): string => {
    return `https://${sbId}-${port}.e2b.dev`
  }

  // Detect if a command starts a dev server
  const detectDevServer = (command: string, output: string): number | null => {
    // Common dev server patterns
    if (command.includes('npm run dev') || command.includes('yarn dev') || command.includes('pnpm dev')) {
      // Vite default
      if (output.includes('5173') || command.includes('vite')) return 5173
      // Next.js default
      if (output.includes('3000')) return 3000
      // Generic
      return 5173
    }
    return null
  }

  const executeWithRetry = async (
    actions: { type: string; path?: string; content?: string; command?: string; name?: string; message?: string }[],
    sbId: string,
    originalIntent: string,
    attemptNumber: number = 1
  ): Promise<boolean> => {
    
    addTerminalLine('system', attemptNumber === 1 ? 'Executing...' : `Retrying... (attempt ${attemptNumber})`)
    
    const execResults = await executeActionsAction(sbId, actions)
    
    // Display results and detect dev server
    const failures: { action: string; error: string }[] = []
    for (const result of execResults) {
      if (result.success) {
        addTerminalLine('stdout', `✓ ${result.action}`)
        if (result.output) {
          addTerminalLine('stdout', result.output)
          // Check if this started a dev server
          const port = detectDevServer(result.action, result.output)
          if (port) {
            const url = getPreviewUrl(sbId, port)
            setPreviewUrl(url)
            addTerminalLine('system', `Preview available at: ${url}`)
          }
        }
      } else {
        addTerminalLine('stderr', `✗ ${result.action}`)
        if (result.output) addTerminalLine('stderr', result.output)
        failures.push({ action: result.action, error: result.output || 'Unknown error' })
      }
    }

    await refreshFileTree(sbId)

    // All succeeded
    if (failures.length === 0) {
      addTerminalLine('system', '✓ All actions completed successfully')
      silentRetryCountRef.current = 0
      
      // Remove reflex indicator if present
      if (reflexMessageIdRef.current) {
        removeMessage(reflexMessageIdRef.current)
        reflexMessageIdRef.current = null
      }
      
      return true
    }

    // Max attempts reached
    if (attemptNumber >= MAX_FIX_ATTEMPTS) {
      addTerminalLine('stderr', `Max attempts (${MAX_FIX_ATTEMPTS}) reached`)
      
      // Remove reflex indicator
      if (reflexMessageIdRef.current) {
        removeMessage(reflexMessageIdRef.current)
        reflexMessageIdRef.current = null
      }
      
      addMessage('gemini', 'Director, the team has hit a strategic impasse. Reviewing the failure logs is required for a creative pivot.')
      return false
    }

    // Progressive Disclosure: Show reflex indicator (not raw diagnosis)
    setAgentStatus('claude-coding')
    
    const fixResult = await orchestrateFixAction(
      originalIntent, 
      failures, 
      sbId, 
      attemptNumber + 1,
      silentRetryCountRef.current
    )

    // Silent retry for transient errors (no UI update)
    if (fixResult.silentRetry) {
      silentRetryCountRef.current++
      addTerminalLine('system', `Transient error. Silent retry ${silentRetryCountRef.current}/${MAX_SILENT_RETRIES}...`)
      await new Promise(r => setTimeout(r, 2000))
      return executeWithRetry(actions, sbId, originalIntent, attemptNumber)
    }

    // Show/update reflex indicator
    const reflexMessage = fixResult.userFacingSummary || 'Self-correcting...'
    if (reflexMessageIdRef.current) {
      updateMessage(reflexMessageIdRef.current, reflexMessage, { attemptNumber: attemptNumber + 1 })
    } else {
      reflexMessageIdRef.current = addMessage('reflex', reflexMessage, { attemptNumber: attemptNumber + 1 })
    }

    // Track issues resolved
    if (fixResult.issuesResolved) {
      issuesResolvedRef.current += fixResult.issuesResolved
    }

    // Escalate to Director
    if (fixResult.phase === 'escalate' || fixResult.requiresDirectorInput) {
      // Remove reflex indicator
      if (reflexMessageIdRef.current) {
        removeMessage(reflexMessageIdRef.current)
        reflexMessageIdRef.current = null
      }
      
      if (fixResult.architectMessage) {
        addMessage('gemini', fixResult.architectMessage)
      } else {
        addMessage('gemini', 'Director, the team has hit a strategic impasse. Reviewing the failure logs is required for a creative pivot.')
      }
      return false
    }

    // Handle reset strategy
    if (fixResult.resetStrategy === 'purge_directory' && fixResult.targetPath) {
      addTerminalLine('system', `Purging ${fixResult.targetPath}...`)
      await purgeDirectoryAction(sbId, fixResult.targetPath)
    } else if (fixResult.resetStrategy === 'full_reset') {
      addTerminalLine('system', 'Full sandbox reset requested...')
      const newSandbox = await fullResetAction()
      setSandboxId(newSandbox.sandboxId)
      sbId = newSandbox.sandboxId
      addTerminalLine('system', `New sandbox: ${sbId}`)
      setPreviewUrl(undefined) // Reset preview URL
    }

    // Execute the fix (no chat message for diagnosis - it's in terminal)
    if (fixResult.approved && fixResult.finalActions.length > 0) {
      return executeWithRetry(fixResult.finalActions, sbId, originalIntent, attemptNumber + 1)
    }

    return false
  }

  const handleUserMessage = async (message: string) => {
    setIsProcessing(true)
    addMessage('user', message)
    currentIntentRef.current = message
    silentRetryCountRef.current = 0
    issuesResolvedRef.current = 0
    reflexMessageIdRef.current = null
    
    let currentSandboxId = sandboxId
    if (!currentSandboxId) {
      setAgentStatus('executing')
      currentSandboxId = await connectSandbox()
    }
    
    if (!currentSandboxId) {
      addMessage('system', 'Failed to connect to sandbox')
      setIsProcessing(false)
      return
    }

    try {
      setAgentStatus('gemini-auditing')
      addTerminalLine('system', 'Product Architect analyzing...')
      
      const result = await orchestrateAction(message, currentSandboxId)
      
      // Clarification
      if (result.phase === 'clarification' && result.architectMessage) {
        addMessage('gemini', result.architectMessage)
        setAgentStatus('idle')
        setIsProcessing(false)
        return
      }
      
      // Show Architect's blueprint
      if (result.architectMessage) {
        addMessage('gemini', result.architectMessage)
      }

      // Show Engineer's plan
      if (result.builderPlan) {
        setAgentStatus('claude-coding')
        addTerminalLine('system', 'Engineering Lead building...')
        addMessage('claude', result.builderPlan.response)
      }
      
      // Show Architect's review
      if (result.architectReview) {
        setAgentStatus('gemini-auditing')
        addMessage('gemini', result.architectReview.reasoning, { approved: result.approved })
      }

      // Execute with self-correction
      if (result.approved && result.finalActions.length > 0) {
        setAgentStatus('executing')
        const success = await executeWithRetry(result.finalActions, currentSandboxId, message)
        
        if (success) {
          // Professional wrap-up message
          if (issuesResolvedRef.current > 0) {
            addMessage('claude', `Build finalized. Auto-resolved ${issuesResolvedRef.current} environment ${issuesResolvedRef.current === 1 ? 'issue' : 'issues'}.`)
          }
          addMessage('system', '✓ Build complete!')
        }
      } else if (!result.approved) {
        addTerminalLine('system', 'Plan not approved by Product Architect')
      }

      setAgentStatus('idle')
    } catch (error) {
      addTerminalLine('stderr', 'Error: ' + error)
      addMessage('system', 'Something went wrong. Check terminal.')
      setAgentStatus('idle')
    }

    setIsProcessing(false)
  }

  if (!isLoaded || checkingOnboarding) {
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
            <p className="text-xs text-gray-500">Claude builds · Gemini architects</p>
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
          <BrainPanel 
            messages={messages} 
            status={
              agentStatus === 'idle' ? 'Ready' : 
              agentStatus === 'claude-coding' ? 'Engineering Lead working...' : 
              agentStatus === 'gemini-auditing' ? 'Product Architect reviewing...' : 
              agentStatus === 'executing' ? 'Executing...' : 
              'Processing...'
            } 
          />
        </div>
        <div className="w-[30%] overflow-hidden">
          <OutputPanel 
            lines={terminalLines} 
            sandboxStatus={sandboxStatus} 
            fileTree={fileTree}
            previewUrl={previewUrl}
          />
        </div>
      </div>
      <CommandBar 
        onSubmit={handleUserMessage} 
        onCancel={handleCancel}
        disabled={isProcessing} 
        isProcessing={isProcessing} 
        placeholder={sandboxId ? 'Describe what you want to build...' : 'Type to connect and start building...'} 
      />
    </main>
  )
}
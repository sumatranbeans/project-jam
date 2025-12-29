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
  fullResetAction,
  readFileAction
} from './actions'
import { checkOnboardingAction } from './vault-actions'
import { Zap, LogOut, Settings } from 'lucide-react'

const MAX_FIX_ATTEMPTS = 3

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
  const silentRetryRef = useRef(0)
  const issuesResolvedRef = useRef(0)
  const reflexIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isLoaded && user) checkOnboarding()
  }, [isLoaded, user])

  const checkOnboarding = async () => {
    try {
      const { completed } = await checkOnboardingAction()
      if (!completed) router.push('/onboarding')
    } finally {
      setCheckingOnboarding(false)
    }
  }

  const addMessage = useCallback((role: Message['role'], content: string, extra?: Partial<Message>) => {
    const id = crypto.randomUUID()
    setMessages(prev => [...prev, { id, role, content, timestamp: new Date(), ...extra }])
    return id
  }, [])

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const addTerminal = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines(prev => [...prev, { id: crypto.randomUUID(), type, content, timestamp: new Date() }])
  }, [])

  const connectSandbox = async (): Promise<string | null> => {
    setSandboxStatus('connecting')
    addTerminal('system', 'Connecting to E2B sandbox...')
    try {
      const { sandboxId: id } = await startSandboxAction()
      setSandboxId(id)
      setSandboxStatus('active')
      addTerminal('system', `Connected: ${id}`)
      const { files } = await listFilesAction(id)
      if (files) setFileTree(files)
      return id
    } catch (e) {
      setSandboxStatus('error')
      addTerminal('stderr', `Connection failed: ${e}`)
      return null
    }
  }

  const refreshFiles = async (id: string) => {
    const { files } = await listFilesAction(id)
    if (files) setFileTree(files)
  }

  const handleReadFile = useCallback(async (path: string) => {
    if (!sandboxId) return { success: false, error: 'No sandbox' }
    return readFileAction(sandboxId, path)
  }, [sandboxId])

  const executeWithRetry = async (
    actions: { type: string; path?: string; content?: string; command?: string; name?: string; message?: string }[],
    sbId: string,
    intent: string,
    attempt: number = 1
  ): Promise<{ success: boolean; previewUrl?: string }> => {
    addTerminal('system', attempt === 1 ? 'Executing...' : `Retrying (attempt ${attempt})...`)
    
    const results = await executeActionsAction(sbId, actions)
    const failures: { action: string; error: string }[] = []
    let foundPreviewUrl: string | undefined

    for (const r of results) {
      if (r.success) {
        addTerminal('stdout', `✓ ${r.action}`)
        if (r.output) addTerminal('stdout', r.output)
        if (r.previewUrl) {
          foundPreviewUrl = r.previewUrl
          setPreviewUrl(r.previewUrl)
          addTerminal('system', `🌐 Preview: ${r.previewUrl}`)
        }
      } else {
        addTerminal('stderr', `✗ ${r.action}`)
        if (r.output) addTerminal('stderr', r.output)
        failures.push({ action: r.action, error: r.output || 'Unknown error' })
      }
    }

    await refreshFiles(sbId)

    if (failures.length === 0) {
      addTerminal('system', '✓ All actions completed')
      if (reflexIdRef.current) {
        removeMessage(reflexIdRef.current)
        reflexIdRef.current = null
      }
      return { success: true, previewUrl: foundPreviewUrl }
    }

    if (attempt >= MAX_FIX_ATTEMPTS) {
      addTerminal('stderr', `Max attempts reached`)
      if (reflexIdRef.current) {
        removeMessage(reflexIdRef.current)
        reflexIdRef.current = null
      }
      addMessage('gemini', 'Director, the team needs your guidance. Please review the errors in the terminal and advise on how to proceed.')
      return { success: false }
    }

    // Self-correction
    setAgentStatus('claude-coding')
    const fix = await orchestrateFixAction(intent, failures, sbId, attempt + 1, silentRetryRef.current)

    if (fix.silentRetry) {
      silentRetryRef.current++
      addTerminal('system', 'Transient error, retrying...')
      await new Promise(r => setTimeout(r, 2000))
      return executeWithRetry(actions, sbId, intent, attempt)
    }

    // Show reflex indicator
    const reflexMsg = fix.userFacingSummary || 'Self-correcting...'
    if (reflexIdRef.current) {
      updateMessage(reflexIdRef.current, { content: reflexMsg, attemptNumber: attempt + 1 })
    } else {
      reflexIdRef.current = addMessage('reflex', reflexMsg, { attemptNumber: attempt + 1 })
    }

    if (fix.issuesResolved) issuesResolvedRef.current += fix.issuesResolved

    if (fix.phase === 'escalate' || fix.requiresDirectorInput) {
      if (reflexIdRef.current) {
        removeMessage(reflexIdRef.current)
        reflexIdRef.current = null
      }
      addMessage('gemini', fix.error || 'Director, the team has encountered an issue that requires your input.')
      return { success: false }
    }

    if (fix.resetStrategy === 'purge_directory' && fix.targetPath) {
      addTerminal('system', `Cleaning ${fix.targetPath}...`)
      await purgeDirectoryAction(sbId, fix.targetPath)
    } else if (fix.resetStrategy === 'full_reset') {
      addTerminal('system', 'Resetting sandbox...')
      const { sandboxId: newId } = await fullResetAction()
      setSandboxId(newId)
      sbId = newId
      addTerminal('system', `New sandbox: ${newId}`)
      setPreviewUrl(undefined)
    }

    if (fix.approved && fix.finalActions.length > 0) {
      return executeWithRetry(fix.finalActions, sbId, intent, attempt + 1)
    }

    return { success: false }
  }

  const handleUserMessage = async (message: string) => {
    setIsProcessing(true)
    addMessage('user', message)
    silentRetryRef.current = 0
    issuesResolvedRef.current = 0
    reflexIdRef.current = null

    let sbId = sandboxId
    if (!sbId) {
      setAgentStatus('executing')
      sbId = await connectSandbox()
    }
    if (!sbId) {
      addMessage('gemini', 'Failed to connect to the sandbox. Please try again.')
      setIsProcessing(false)
      return
    }

    try {
      // Phase 1: Architect analyzes
      setAgentStatus('gemini-auditing')
      addTerminal('system', 'Product Architect analyzing...')
      const result = await orchestrateAction(message, sbId)

      if (result.phase === 'clarification') {
        addMessage('gemini', result.architectMessage || 'Could you provide more details?')
        setAgentStatus('idle')
        setIsProcessing(false)
        return
      }

      // Show Architect's blueprint
      if (result.architectMessage) {
        addMessage('gemini', result.architectMessage)
      }

      // Phase 2: Architect reviews (show approval/veto)
      if (result.architectReview) {
        setAgentStatus('gemini-auditing')
        addMessage('gemini', result.architectReview.reasoning, { approved: result.approved })
      }

      // Phase 3: Execute (if approved)
      if (result.approved && result.finalActions.length > 0) {
        setAgentStatus('executing')
        addTerminal('system', 'Engineering Lead executing...')
        
        const { success, previewUrl: finalUrl } = await executeWithRetry(result.finalActions, sbId, message)

        // Remove reflex indicator if still present
        if (reflexIdRef.current) {
          removeMessage(reflexIdRef.current)
          reflexIdRef.current = null
        }

        // Phase 4: Engineering Lead reports completion (AFTER execution)
        if (success) {
          let completionMsg = '✓ Build complete.'
          if (issuesResolvedRef.current > 0) {
            completionMsg += ` Auto-resolved ${issuesResolvedRef.current} ${issuesResolvedRef.current === 1 ? 'issue' : 'issues'}.`
          }
          completionMsg += '\n\n'
          if (finalUrl || previewUrl) {
            completionMsg += `**Preview:** ${finalUrl || previewUrl}\n`
            completionMsg += 'Click the **Preview** tab to see it live.'
          } else {
            completionMsg += 'Check the **Files** tab to view the code.'
          }
          addMessage('claude', completionMsg)
        }
      } else if (!result.approved) {
        addTerminal('system', 'Plan not approved')
      }

      setAgentStatus('idle')
    } catch (e) {
      addTerminal('stderr', `Error: ${e}`)
      addMessage('gemini', 'Something went wrong. Please check the terminal for details.')
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
            <button onClick={() => router.push('/settings')} className="p-2 hover:bg-gray-100 rounded-lg"><Settings className="w-4 h-4" /></button>
            <SignOutButton><button className="p-2 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" /></button></SignOutButton>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[70%] border-r border-jam-border overflow-hidden">
          <BrainPanel messages={messages} status={agentStatus === 'idle' ? 'Ready' : agentStatus === 'claude-coding' ? 'Engineering Lead working...' : agentStatus === 'gemini-auditing' ? 'Product Architect reviewing...' : 'Executing...'} />
        </div>
        <div className="w-[30%] overflow-hidden">
          <OutputPanel lines={terminalLines} sandboxStatus={sandboxStatus} fileTree={fileTree} previewUrl={previewUrl} onReadFile={handleReadFile} />
        </div>
      </div>
      <CommandBar onSubmit={handleUserMessage} onCancel={() => { setIsProcessing(false); setAgentStatus('idle') }} disabled={isProcessing} isProcessing={isProcessing} placeholder={sandboxId ? 'Describe what you want to build...' : 'Type to connect and start building...'} />
    </main>
  )
}
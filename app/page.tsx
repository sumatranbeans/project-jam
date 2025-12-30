'use client'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'
import { BrainPanel, type Message } from '@/components/BrainPanel'
import { OutputPanel, type TerminalLine } from '@/components/OutputPanel'
import { CommandBar } from '@/components/CommandBar'
import { StatusIndicator, type AgentStatus } from '@/components/StatusIndicator'
import {
  startSandboxAction, listFilesAction, orchestrateAction, executeActionsAction,
  orchestrateFixAction, readFileAction
} from './actions'
import { checkOnboardingAction } from './vault-actions'
import { Zap, LogOut, Settings } from 'lucide-react'

const MAX_ATTEMPTS = 3

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
  const [previewUrl, setPreviewUrl] = useState<string | undefined>()
  const silentRetryRef = useRef(0)
  const issuesRef = useRef(0)
  const reflexIdRef = useRef<string | null>(null)

  useEffect(() => { if (isLoaded && user) checkOnboarding() }, [isLoaded, user])

  const checkOnboarding = async () => {
    try {
      const { completed } = await checkOnboardingAction()
      if (!completed) router.push('/onboarding')
    } finally { setCheckingOnboarding(false) }
  }

  const addMsg = useCallback((role: Message['role'], content: string, extra?: Partial<Message>) => {
    const id = crypto.randomUUID()
    setMessages(p => [...p, { id, role, content, timestamp: new Date(), ...extra }])
    return id
  }, [])

  const removeMsg = useCallback((id: string) => setMessages(p => p.filter(m => m.id !== id)), [])
  const updateMsg = useCallback((id: string, u: Partial<Message>) => setMessages(p => p.map(m => m.id === id ? { ...m, ...u } : m)), [])
  const addTerm = useCallback((type: TerminalLine['type'], content: string) => {
    setTerminalLines(p => [...p, { id: crypto.randomUUID(), type, content, timestamp: new Date() }])
  }, [])

  const connectSandbox = async (): Promise<string | null> => {
    setSandboxStatus('connecting')
    addTerm('system', 'Connecting to CodeSandbox...')
    try {
      const { sandboxId: id } = await startSandboxAction()
      setSandboxId(id)
      setSandboxStatus('active')
      addTerm('system', `Connected: ${id}`)
      const { files } = await listFilesAction(id)
      if (files) setFileTree(files)
      return id
    } catch (e) {
      setSandboxStatus('error')
      addTerm('stderr', `Failed: ${e}`)
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
    sbId: string, intent: string, attempt = 1
  ): Promise<{ success: boolean; previewUrl?: string }> => {
    addTerm('system', attempt === 1 ? 'Executing...' : `Retry ${attempt}...`)
    const results = await executeActionsAction(sbId, actions)
    const failures: { action: string; error: string }[] = []
    let foundUrl: string | undefined

    for (const r of results) {
      if (r.success) {
        addTerm('stdout', `✓ ${r.action}`)
        if (r.output) addTerm('stdout', r.output)
        if (r.previewUrl) { foundUrl = r.previewUrl; setPreviewUrl(r.previewUrl); addTerm('system', `🌐 Preview: ${r.previewUrl}`) }
      } else {
        addTerm('stderr', `✗ ${r.action}`)
        if (r.output) addTerm('stderr', r.output)
        failures.push({ action: r.action, error: r.output || 'Unknown' })
      }
    }
    await refreshFiles(sbId)

    if (!failures.length) {
      if (reflexIdRef.current) { removeMsg(reflexIdRef.current); reflexIdRef.current = null }
      return { success: true, previewUrl: foundUrl }
    }

    if (attempt >= MAX_ATTEMPTS) {
      if (reflexIdRef.current) { removeMsg(reflexIdRef.current); reflexIdRef.current = null }
      addMsg('gemini', 'Director, the team needs guidance. Please review the terminal errors.')
      return { success: false }
    }

    setAgentStatus('claude-coding')
    const fix = await orchestrateFixAction(intent, failures, sbId, attempt + 1, silentRetryRef.current)

    if (fix.silentRetry) {
      silentRetryRef.current++
      await new Promise(r => setTimeout(r, 2000))
      return executeWithRetry(actions, sbId, intent, attempt)
    }

    const msg = fix.userFacingSummary || 'Self-correcting...'
    if (reflexIdRef.current) updateMsg(reflexIdRef.current, { content: msg, attemptNumber: attempt + 1 })
    else reflexIdRef.current = addMsg('reflex', msg, { attemptNumber: attempt + 1 })

    if (fix.issuesResolved) issuesRef.current += fix.issuesResolved

    if (fix.phase === 'escalate' || fix.requiresDirectorInput) {
      if (reflexIdRef.current) { removeMsg(reflexIdRef.current); reflexIdRef.current = null }
      addMsg('gemini', fix.error || 'The team needs your input.')
      return { success: false }
    }

    if (fix.approved && fix.finalActions.length) {
      return executeWithRetry(fix.finalActions, sbId, intent, attempt + 1)
    }
    return { success: false }
  }

  const handleUserMessage = async (message: string) => {
    setIsProcessing(true)
    addMsg('user', message)
    silentRetryRef.current = 0
    issuesRef.current = 0
    reflexIdRef.current = null

    let sbId = sandboxId
    if (!sbId) { setAgentStatus('executing'); sbId = await connectSandbox() }
    if (!sbId) { addMsg('gemini', 'Failed to connect.'); setIsProcessing(false); return }

    try {
      // PHASE 1: Architect blueprints
      setAgentStatus('gemini-auditing')
      addTerm('system', 'Product Architect analyzing...')
      const result = await orchestrateAction(message, sbId)

      if (result.phase === 'clarification') {
        addMsg('gemini', result.architectMessage || 'Could you clarify?')
        setAgentStatus('idle'); setIsProcessing(false); return
      }

      // Show Architect blueprint
      if (result.architectMessage) addMsg('gemini', result.architectMessage)

      // PHASE 2: Engineer proposes
      if (result.builderPlan?.response) {
        setAgentStatus('claude-coding')
        addTerm('system', 'Engineering Lead planning...')
        addMsg('claude', result.builderPlan.response)
      }

      // PHASE 3: Architect reviews
      if (result.architectReview) {
        setAgentStatus('gemini-auditing')
        addMsg('gemini', result.architectReview.reasoning, { approved: result.approved })
      }

      // PHASE 4: Execute
      if (result.approved && result.finalActions.length) {
        setAgentStatus('executing')
        addTerm('system', 'Executing build...')
        const { success, previewUrl: url } = await executeWithRetry(result.finalActions, sbId, message)

        if (reflexIdRef.current) { removeMsg(reflexIdRef.current); reflexIdRef.current = null }

        if (success) {
          let msg = '✓ Build complete.'
          if (issuesRef.current > 0) msg += ` Auto-resolved ${issuesRef.current} issue${issuesRef.current > 1 ? 's' : ''}.`
          if (url || previewUrl) {
            msg += `\n\n**Preview:** ${url || previewUrl}\nClick the **Preview** tab to see it live.`
          } else {
            msg += '\n\nCheck the **Files** tab to view the code.'
          }
          addMsg('claude', msg)
        }
      } else if (!result.approved) {
        addTerm('system', 'Plan not approved')
      }

      setAgentStatus('idle')
    } catch (e) {
      addTerm('stderr', `Error: ${e}`)
      addMsg('gemini', 'Something went wrong.')
      setAgentStatus('idle')
    }
    setIsProcessing(false)
  }

  if (!isLoaded || checkingOnboarding) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>

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
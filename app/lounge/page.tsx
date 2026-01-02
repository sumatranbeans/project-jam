'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  MessageSquare, LogOut, Settings, Send, Square, MessageCircle,
  Copy, ThumbsUp, ThumbsDown, Plus, Clock, ChevronDown, ChevronUp, Check, RefreshCw
} from 'lucide-react'

// Types
interface Message {
  id: string
  role: 'user' | 'claude' | 'gemini' | 'system'
  content: string
  thinking?: string
  tokensIn?: number
  tokensOut?: number
  timestamp: Date
  feedback?: 'up' | 'down'
}

interface ScribeCheckpoint {
  timestamp: Date
  energy: number
  summary: string
  claudeStance?: string
  geminiStance?: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  scribeCheckpoints: ScribeCheckpoint[]
  createdAt: Date
}

interface AgentSettings {
  verbosity: number
  creativity: number
  tension: number
  speed: number
}

interface AgentState {
  name: string
  settings: AgentSettings
  tokensIn: number
  tokensOut: number
  isRefreshed: boolean
  refreshCount: number
}

const defaultSettings: AgentSettings = { verbosity: 2, creativity: 2, tension: 2, speed: 2 }

// Claude Logo Component
function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 1200" className={className} fill="#d97757">
      <path d="M 233.959793 800.214905 L 468.644287 668.536987 L 472.590637 657.100647 L 468.644287 650.738403 L 457.208069 650.738403 L 417.986633 648.322144 L 283.892639 644.69812 L 167.597321 639.865845 L 54.926208 633.825623 L 26.577238 627.785339 L 3.3e-05 592.751709 L 2.73832 575.27533 L 26.577238 559.248352 L 60.724873 562.228149 L 136.187973 567.382629 L 249.422867 575.194763 L 331.570496 580.026978 L 453.261841 592.671082 L 472.590637 592.671082 L 475.328857 584.859009 L 468.724915 580.026978 L 463.570557 575.194763 L 346.389313 495.785217 L 219.543671 411.865906 L 153.100723 363.543762 L 117.181267 339.060425 L 99.060455 316.107361 L 91.248367 266.01355 L 123.865784 230.093994 L 167.677887 233.073853 L 178.872513 236.053772 L 223.248367 270.201477 L 318.040283 343.570496 L 441.825592 434.738342 L 459.946411 449.798706 L 467.194672 444.64447 L 468.080597 441.020203 L 459.946411 427.409485 L 392.617493 305.718323 L 320.778564 181.932983 L 288.80542 130.630859 L 280.348999 99.865845 C 277.369171 87.221436 275.194641 76.590698 275.194641 63.624268 L 312.322174 13.20813 L 332.8591 6.604126 L 382.389313 13.20813 L 403.248352 31.328979 L 434.013519 101.71814 L 483.865753 212.537048 L 561.181274 363.221497 L 583.812134 407.919434 L 595.892639 449.315491 L 600.40271 461.959839 L 608.214783 461.959839 L 608.214783 454.711609 L 614.577271 369.825623 L 626.335632 265.61084 L 637.771851 131.516846 L 641.718201 93.745117 L 660.402832 48.483276 L 697.530334 24.000122 L 726.52356 37.852417 L 750.362549 72 L 747.060486 94.067139 L 732.886047 186.201416 L 705.100708 330.52356 L 686.979919 427.167847 L 697.530334 427.167847 L 709.61084 415.087341 L 758.496704 350.174561 L 840.644348 247.490051 L 876.885925 206.738342 L 919.167847 161.71814 L 946.308838 140.29541 L 997.61084 140.29541 L 1035.38269 196.429626 L 1018.469849 254.416199 L 965.637634 321.422852 L 921.825562 378.201538 L 859.006714 462.765259 L 819.785278 530.41626 L 823.409424 535.812073 L 832.75177 534.92627 L 974.657776 504.724915 L 1051.328979 490.872559 L 1142.818848 475.167786 L 1184.214844 494.496582 L 1188.724854 514.147644 L 1172.456421 554.335693 L 1074.604126 578.496765 L 959.838989 601.449829 L 788.939636 641.879272 L 786.845764 643.409485 L 789.261841 646.389343 L 866.255127 653.637634 L 899.194702 655.409424 L 979.812134 655.409424 L 1129.932861 666.604187 L 1169.154419 692.537109 L 1192.671265 724.268677 L 1188.724854 748.429688 L 1128.322144 779.194641 L 1046.818848 759.865845 L 856.590759 714.604126 L 791.355774 698.335754 L 782.335693 698.335754 L 782.335693 703.731567 L 836.69812 756.885986 L 936.322205 846.845581 L 1061.073975 962.81897 L 1067.436279 991.490112 L 1051.409424 1014.120911 L 1034.496704 1011.704712 L 924.885986 929.234924 L 882.604126 892.107544 L 786.845764 811.48999 L 780.483276 811.48999 L 780.483276 819.946289 L 802.550415 852.241699 L 919.087341 1027.409424 L 925.127625 1081.127686 L 916.671204 1098.604126 L 886.469849 1109.154419 L 853.288696 1103.114136 L 785.073914 1007.355835 L 714.684631 899.516785 L 657.906067 802.872498 L 650.979858 806.81897 L 617.476624 1167.704834 L 601.771851 1186.147705 L 565.530212 1200 L 535.328857 1177.046997 L 519.302124 1139.919556 L 535.328857 1066.550537 L 554.657776 970.792053 L 570.362488 894.68457 L 584.536926 800.134277 L 592.993347 768.724976 L 592.429626 766.630859 L 585.503479 767.516968 L 514.22821 865.369263 L 405.825531 1011.865906 L 320.053711 1103.677979 L 299.516815 1111.812256 L 263.919525 1093.369263 L 267.221497 1060.429688 L 287.114136 1031.114136 L 405.825531 880.107361 L 477.422913 786.52356 L 523.651062 732.483276 L 523.328918 724.671265 L 520.590698 724.671265 L 205.288605 929.395935 L 149.154434 936.644409 L 124.993355 914.01355 L 127.973183 876.885986 L 139.409409 864.80542 L 234.201385 799.570435 L 233.879227 799.8927 Z"/>
    </svg>
  )
}

// Gemini Logo Component
function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 65 65" className={className} fill="none">
      <defs>
        <linearGradient id="geminiGrad" x1="18.447" y1="43.42" x2="52.153" y2="15.004" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4893FC"/>
          <stop offset="0.27" stopColor="#4893FC"/>
          <stop offset="0.777" stopColor="#969DFF"/>
          <stop offset="1" stopColor="#BD99FE"/>
        </linearGradient>
      </defs>
      <path d="M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z" fill="url(#geminiGrad)"/>
    </svg>
  )
}

// Flash Logo Component
function FlashLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#FBBC04">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )
}

// Elegant 3-point slider
function ThreePointSlider({ value, onChange, labels, color = 'gray' }: { 
  value: number
  onChange: (v: number) => void
  labels: [string, string, string]
  color?: 'orange' | 'blue' | 'gray'
}) {
  const dotColors = { orange: 'bg-orange-500', blue: 'bg-blue-500', gray: 'bg-gray-500' }
  
  return (
    <div className="w-full">
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-px bg-gray-200" />
        <div className={`absolute h-px ${dotColors[color]} transition-all`} style={{ left: 0, width: value === 1 ? '0%' : value === 2 ? '50%' : '100%' }} />
        {[1, 2, 3].map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`absolute w-2.5 h-2.5 rounded-full border-2 transition-all ${
              v <= value ? `${dotColors[color]} border-transparent` : 'bg-white border-gray-300 hover:border-gray-400'
            }`}
            style={{ left: v === 1 ? '0%' : v === 2 ? 'calc(50% - 5px)' : 'calc(100% - 10px)' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-gray-400 -mt-0.5">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
        <span>{labels[2]}</span>
      </div>
    </div>
  )
}

// 5-point agent priority
function AgentPrioritySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="w-full">
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-orange-300 via-gray-200 to-blue-300" />
        {[-2, -1, 0, 1, 2].map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`absolute w-2.5 h-2.5 rounded-full border-2 transition-all ${
              v === value 
                ? v < 0 ? 'bg-orange-500 border-orange-500' : v > 0 ? 'bg-blue-500 border-blue-500' : 'bg-gray-500 border-gray-500'
                : 'bg-white border-gray-300 hover:border-gray-400'
            }`}
            style={{ left: `calc(${(v + 2) * 25}% - 5px)` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-gray-400 -mt-0.5">
        <span className="text-orange-500">Claude</span>
        <span>Neutral</span>
        <span className="text-blue-500">Gemini</span>
      </div>
    </div>
  )
}

// Format text with basic markdown
function FormattedText({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
        if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-gray-100 px-0.5 rounded text-[10px]">{part.slice(1, -1)}</code>
        return part
      })}
    </span>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function LoungePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [scribeCheckpoints, setScribeCheckpoints] = useState<ScribeCheckpoint[]>([])
  
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentThinking, setCurrentThinking] = useState<{ agent: string; text: string } | null>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [showScribe, setShowScribe] = useState(false)
  const [agentPriority, setAgentPriority] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [lastCheckpointEnergy, setLastCheckpointEnergy] = useState<Record<string, number>>({ claude: 100, gemini: 100 })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    claude: { name: 'Claude', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, isRefreshed: false, refreshCount: 0 },
    gemini: { name: 'Gemini', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, isRefreshed: false, refreshCount: 0 }
  })

  const getEnergy = (tokensIn: number, tokensOut: number, model: 'claude' | 'gemini') => {
    const contextWindow = model === 'claude' ? 200000 : 1000000
    return Math.max(0, 100 - ((tokensIn + tokensOut) / contextWindow) * 100)
  }

  // Check if we need a checkpoint (every 5% drop)
  const checkForCheckpoint = useCallback((agentId: string, currentEnergy: number) => {
    const lastEnergy = lastCheckpointEnergy[agentId]
    const energyDrop = lastEnergy - currentEnergy
    
    if (energyDrop >= 5) {
      // Create checkpoint
      const checkpoint: ScribeCheckpoint = {
        timestamp: new Date(),
        energy: currentEnergy,
        summary: `Checkpoint at ${currentEnergy.toFixed(0)}% energy. ${messages.length} messages in conversation.`,
        claudeStance: messages.filter(m => m.role === 'claude').slice(-1)[0]?.content?.slice(0, 100),
        geminiStance: messages.filter(m => m.role === 'gemini').slice(-1)[0]?.content?.slice(0, 100)
      }
      
      setScribeCheckpoints(prev => [...prev, checkpoint])
      setLastCheckpointEnergy(prev => ({ ...prev, [agentId]: currentEnergy }))
      
      // If energy is critical (< 10%), prepare for refresh
      if (currentEnergy < 10) {
        return true // Signal that refresh is needed
      }
    }
    return false
  }, [lastCheckpointEnergy, messages])

  // Refresh an agent
  const refreshAgent = useCallback((agentId: string) => {
    // Add system message about refresh
    const systemMsg: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `🔄 ${agents[agentId].name} has refreshed and rejoined the conversation.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, systemMsg])
    
    // Reset agent tokens but keep settings
    setAgents(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        tokensIn: 0,
        tokensOut: 0,
        isRefreshed: true,
        refreshCount: prev[agentId].refreshCount + 1
      }
    }))
    
    setLastCheckpointEnergy(prev => ({ ...prev, [agentId]: 100 }))
  }, [agents])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentThinking])

  // Load conversations
  useEffect(() => {
    const saved = localStorage.getItem('lounge-conversations-v2')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConversations(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
          scribeCheckpoints: (c.scribeCheckpoints || []).map((cp: any) => ({ ...cp, timestamp: new Date(cp.timestamp) }))
        })))
      } catch {}
    }
  }, [])

  // Save conversations
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('lounge-conversations-v2', JSON.stringify(conversations))
    }
  }, [conversations])

  // Save checkpoints to conversation
  useEffect(() => {
    if (activeConversationId && scribeCheckpoints.length > 0) {
      setConversations(prev => prev.map(c => 
        c.id === activeConversationId ? { ...c, scribeCheckpoints } : c
      ))
    }
  }, [scribeCheckpoints, activeConversationId])

  const updateAgentSetting = (agentId: string, key: keyof AgentSettings, value: number) => {
    setAgents(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], settings: { ...prev[agentId].settings, [key]: value } }
    }))
  }

  const addMessage = useCallback((role: Message['role'], content: string, thinking?: string, tokensIn?: number, tokensOut?: number) => {
    const msg: Message = { id: crypto.randomUUID(), role, content, thinking, tokensIn, tokensOut, timestamp: new Date() }
    setMessages(prev => [...prev, msg])
    
    if (activeConversationId) {
      setConversations(prev => prev.map(c => 
        c.id === activeConversationId ? { ...c, messages: [...c.messages, msg] } : c
      ))
    }
    return msg
  }, [activeConversationId])

  const setMessageFeedback = (msgId: string, feedback: 'up' | 'down') => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m))
  }

  const startNewConversation = () => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: 'New conversation',
      messages: [],
      scribeCheckpoints: [],
      createdAt: new Date()
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setMessages([])
    setScribeCheckpoints([])
    setLastCheckpointEnergy({ claude: 100, gemini: 100 })
    setAgents({
      claude: { name: 'Claude', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, isRefreshed: false, refreshCount: 0 },
      gemini: { name: 'Gemini', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, isRefreshed: false, refreshCount: 0 }
    })
  }

  const loadConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id)
    setMessages(conv.messages)
    setScribeCheckpoints(conv.scribeCheckpoints || [])
  }

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return
    
    if (!activeConversationId) {
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        title: input.trim().slice(0, 40) + (input.length > 40 ? '...' : ''),
        messages: [],
        scribeCheckpoints: [],
        createdAt: new Date()
      }
      setConversations(prev => [newConv, ...prev])
      setActiveConversationId(newConv.id)
    }
    
    await sendMessage(input.trim())
  }

  const handlePoke = async (agentId: string) => {
    if (isProcessing) return
    await sendMessage(`@${agentId} Please elaborate.`, true)
  }

  const handleHush = () => {
    abortControllerRef.current?.abort()
    setIsProcessing(false)
    setCurrentThinking(null)
    setActiveAgent(null)
  }

  const sendMessage = async (messageText: string, isPoke = false) => {
    setInput('')
    setIsProcessing(true)
    if (!isPoke) addMessage('user', messageText)

    abortControllerRef.current = new AbortController()

    try {
      // Include scribe checkpoints in context for refreshed agents
      const scribeContext = scribeCheckpoints.length > 0 
        ? scribeCheckpoints.map(cp => `[Checkpoint ${formatTime(cp.timestamp)}] ${cp.summary}`).join('\n')
        : ''

      const response = await fetch('/api/lounge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageText }],
          agents: { claude: agents.claude.settings, gemini: agents.gemini.settings },
          bias: agentPriority,
          scribeContext,
          refreshedAgents: {
            claude: agents.claude.isRefreshed,
            gemini: agents.gemini.isRefreshed
          }
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok || !response.body) throw new Error('Failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'thinking') {
              setActiveAgent(data.agent)
              setCurrentThinking({ agent: data.agent, text: data.content })
            } else if (data.type === 'complete') {
              setCurrentThinking(null)
              addMessage(data.agent, data.content, data.thinking, data.tokens?.in, data.tokens?.out)
              
              const newTokensIn = (data.tokens?.in || 0)
              const newTokensOut = (data.tokens?.out || 0)
              
              setAgents(prev => {
                const agentKey = data.agent as 'claude' | 'gemini'
                const updated = {
                  ...prev,
                  [agentKey]: {
                    ...prev[agentKey],
                    tokensIn: prev[agentKey].tokensIn + newTokensIn,
                    tokensOut: prev[agentKey].tokensOut + newTokensOut,
                    isRefreshed: false
                  }
                }
                
                // Check energy and create checkpoint if needed
                const newEnergy = getEnergy(
                  updated[agentKey].tokensIn,
                  updated[agentKey].tokensOut,
                  agentKey
                )
                
                const needsRefresh = checkForCheckpoint(agentKey, newEnergy)
                if (needsRefresh) {
                  setTimeout(() => refreshAgent(agentKey), 500)
                }
                
                return updated
              })
              
              setActiveAgent(null)
            }
          } catch {}
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        addMessage('claude', 'Sorry, something went wrong.')
      }
    } finally {
      setIsProcessing(false)
      setCurrentThinking(null)
      setActiveAgent(null)
    }
  }

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm">Loading...</div>

  return (
    <main className="flex flex-col h-screen bg-gray-50 text-[13px]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 via-purple-500 to-blue-500 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-gray-800">Lounge</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{user?.firstName || 'User'}</span>
          <button onClick={() => router.push('/settings')} className="p-1.5 hover:bg-gray-100 rounded">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <SignOutButton>
            <button className="p-1.5 hover:bg-gray-100 rounded"><LogOut className="w-3.5 h-3.5" /></button>
          </SignOutButton>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left - History */}
        <div className="w-48 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-2">
            <button onClick={startNewConversation} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg">
              <Plus className="w-3 h-3" /> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-50 ${
                  activeConversationId === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                <div className="font-medium text-gray-700 truncate">{conv.title}</div>
                <div className="text-[10px] text-gray-400">{conv.messages.length} msgs</div>
              </button>
            ))}
          </div>
        </div>

        {/* Center - Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Start a conversation</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                  {msg.role === 'system' ? (
                    <div className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      msg.role === 'user' ? 'bg-gray-800 text-white'
                        : msg.role === 'claude' ? 'bg-orange-50 border border-orange-100'
                        : 'bg-blue-50 border border-blue-100'
                    }`}>
                      {msg.role !== 'user' && (
                        <div className={`text-[10px] font-medium mb-1 flex items-center gap-1.5 ${
                          msg.role === 'claude' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {msg.role === 'claude' ? <ClaudeLogo className="w-3.5 h-3.5" /> : <GeminiLogo className="w-3.5 h-3.5" />}
                          {msg.role === 'claude' ? 'Claude' : 'Gemini'}
                          {agents[msg.role].refreshCount > 0 && (
                            <span className="text-[8px] bg-green-100 text-green-600 px-1 rounded">fresh</span>
                          )}
                          <span className="text-gray-400 font-normal flex items-center gap-0.5 ml-auto">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}
                      <div className="text-xs leading-relaxed whitespace-pre-wrap">
                        <FormattedText content={msg.content} />
                      </div>
                      
                      {msg.role !== 'user' && (
                        <div className="flex items-center gap-0.5 mt-1.5 pt-1.5 border-t border-black/5">
                          <button onClick={() => copyMessage(msg.content, msg.id)} className="p-1 hover:bg-black/5 rounded text-gray-400 hover:text-gray-600" title="Copy">
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button onClick={() => setMessageFeedback(msg.id, 'up')} className={`p-1 hover:bg-black/5 rounded ${msg.feedback === 'up' ? 'text-green-500' : 'text-gray-400 hover:text-green-600'}`}>
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => setMessageFeedback(msg.id, 'down')} className={`p-1 hover:bg-black/5 rounded ${msg.feedback === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-red-600'}`}>
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            
            {currentThinking && (
              <div className="flex justify-start">
                <div className={`rounded-xl px-3 py-2 text-xs ${currentThinking.agent === 'claude' ? 'bg-orange-50/50' : 'bg-blue-50/50'}`}>
                  <span className={`${currentThinking.agent === 'claude' ? 'text-orange-400' : 'text-blue-400'} animate-pulse`}>
                    {currentThinking.agent === 'claude' ? 'Claude' : 'Gemini'} thinking...
                  </span>
                  <span className="text-gray-400 italic ml-1">"{currentThinking.text}"</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isProcessing}
              />
              {isProcessing ? (
                <button type="button" onClick={handleHush} className="px-3 py-2 bg-red-500 text-white rounded-lg">
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} className="px-3 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right - Controls */}
        <div className="w-52 border-l border-gray-200 bg-white flex flex-col text-xs overflow-y-auto">
          {/* Agent Priority */}
          <div className="p-3 border-b border-gray-100">
            <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wide mb-2">Priority</div>
            <AgentPrioritySelector value={agentPriority} onChange={setAgentPriority} />
          </div>

          {/* Agent Controls */}
          <div className="flex-1 p-3 space-y-2.5">
            {Object.entries(agents).map(([id, agent]) => {
              const color = id === 'claude' ? 'orange' : 'blue' as const
              const energy = getEnergy(agent.tokensIn, agent.tokensOut, id as 'claude' | 'gemini')
              const isLowEnergy = energy < 20
              const isCritical = energy < 10
              
              return (
                <div key={id} className={`p-2 rounded-lg border ${
                  isCritical ? 'bg-red-50 border-red-200 animate-pulse' :
                  activeAgent === id 
                    ? id === 'claude' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {id === 'claude' ? <ClaudeLogo className="w-4 h-4" /> : <GeminiLogo className="w-4 h-4" />}
                      <span className={`font-medium text-[11px] ${id === 'claude' ? 'text-orange-700' : 'text-blue-700'}`}>
                        {agent.name}
                      </span>
                      {agent.refreshCount > 0 && <RefreshCw className="w-2.5 h-2.5 text-green-500" />}
                    </div>
                    <button onClick={() => handlePoke(id)} disabled={isProcessing} className="text-[8px] px-1.5 py-0.5 rounded bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                      Poke
                    </button>
                  </div>

                  {/* Energy */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[8px] text-gray-500 mb-0.5">
                      <span>Energy</span>
                      <span className={isCritical ? 'text-red-500 font-bold' : isLowEnergy ? 'text-yellow-600' : ''}>{energy.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${energy > 50 ? 'bg-green-500' : energy > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${energy}%` }} />
                    </div>
                    <div className="text-[7px] text-gray-400 mt-0.5">
                      {(agent.tokensIn + agent.tokensOut).toLocaleString()} ({agent.tokensIn.toLocaleString()}↓ {agent.tokensOut.toLocaleString()}↑)
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-2">
                    <div>
                      <div className="text-[8px] text-gray-500 mb-0.5">Verbosity</div>
                      <ThreePointSlider value={agent.settings.verbosity} onChange={(v) => updateAgentSetting(id, 'verbosity', v)} labels={['Brief', 'Medium', 'Full']} color={color} />
                    </div>
                    <div>
                      <div className="text-[8px] text-gray-500 mb-0.5">Creativity</div>
                      <ThreePointSlider value={agent.settings.creativity} onChange={(v) => updateAgentSetting(id, 'creativity', v)} labels={['Factual', 'Balanced', 'Creative']} color={color} />
                    </div>
                    <div>
                      <div className="text-[8px] text-gray-500 mb-0.5">Tension</div>
                      <ThreePointSlider value={agent.settings.tension} onChange={(v) => updateAgentSetting(id, 'tension', v)} labels={['Chill', 'Medium', 'Spicy']} color={color} />
                    </div>
                    <div>
                      <div className="text-[8px] text-gray-500 mb-0.5">Speed</div>
                      <ThreePointSlider value={agent.settings.speed} onChange={(v) => updateAgentSetting(id, 'speed', v)} labels={['Deep', 'Medium', 'Fast']} color={color} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scribe Section - Bottom */}
          <div className="border-t border-gray-100 p-2">
            <button onClick={() => setShowScribe(!showScribe)} className="w-full flex items-center justify-between text-[9px] font-medium text-gray-500">
              <span className="flex items-center gap-1">
                <FlashLogo className="w-3 h-3" />
                Scribe ({scribeCheckpoints.length})
              </span>
              {showScribe ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
            {showScribe && scribeCheckpoints.length > 0 && (
              <div className="mt-1.5 max-h-24 overflow-y-auto space-y-1">
                {scribeCheckpoints.map((cp, i) => (
                  <div key={i} className="text-[8px] text-gray-500 bg-yellow-50 rounded p-1.5">
                    <div className="font-medium text-yellow-700">{formatTime(cp.timestamp)} • {cp.energy.toFixed(0)}%</div>
                    <div className="text-gray-600 mt-0.5">{cp.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  MessageSquare, LogOut, Settings, Send, Square, MessageCircle,
  Copy, ThumbsUp, ThumbsDown, Plus, Clock, ChevronDown, ChevronUp, Check, RefreshCw,
  Paperclip, X, Image as ImageIcon, FileText
} from 'lucide-react'

// Types
interface Attachment {
  id: string
  type: 'image' | 'file'
  name: string
  url: string
  base64?: string
}

interface Message {
  id: string
  role: 'user' | 'claude' | 'gemini' | 'system'
  content: string
  thinking?: string
  tokensIn?: number
  tokensOut?: number
  timestamp: Date
  feedback?: 'up' | 'down'
  attachments?: Attachment[]
}

interface ScribeNote {
  timestamp: Date
  content: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  scribeNotes: ScribeNote[]
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

// Claude Logo
function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 1200" className={className} fill="#d97757">
      <path d="M 233.96 800.21 L 468.64 668.54 L 472.59 657.1 L 468.64 650.74 L 457.21 650.74 L 417.99 648.32 L 283.89 644.7 L 167.6 639.87 L 54.93 633.83 L 26.58 627.79 L 0 592.75 L 2.74 575.28 L 26.58 559.25 L 60.72 562.23 L 136.19 567.38 L 249.42 575.19 L 331.57 580.03 L 453.26 592.67 L 472.59 592.67 L 475.33 584.86 L 468.72 580.03 L 463.57 575.19 L 346.39 495.79 L 219.54 411.87 L 153.1 363.54 L 117.18 339.06 L 99.06 316.11 L 91.25 266.01 L 123.87 230.09 L 167.68 233.07 L 178.87 236.05 L 223.25 270.2 L 318.04 343.57 L 441.83 434.74 L 459.95 449.8 L 467.19 444.64 L 468.08 441.02 L 459.95 427.41 L 392.62 305.72 L 320.78 181.93 L 288.81 130.63 L 280.35 99.87 C 277.37 87.22 275.19 76.59 275.19 63.62 L 312.32 13.21 L 332.86 6.6 L 382.39 13.21 L 403.25 31.33 L 434.01 101.72 L 483.87 212.54 L 561.18 363.22 L 583.81 407.92 L 595.89 449.32 L 600.4 461.96 L 608.21 461.96 L 608.21 454.71 L 614.58 369.83 L 626.34 265.61 L 637.77 131.52 L 641.72 93.75 L 660.4 48.48 L 697.53 24 L 726.52 37.85 L 750.36 72 L 747.06 94.07 L 732.89 186.2 L 705.1 330.52 L 686.98 427.17 L 697.53 427.17 L 709.61 415.09 L 758.5 350.17 L 840.64 247.49 L 876.89 206.74 L 919.17 161.72 L 946.31 140.3 L 997.61 140.3 L 1035.38 196.43 L 1018.47 254.42 L 965.64 321.42 L 921.83 378.2 L 859.01 462.77 L 819.79 530.42 L 823.41 535.81 L 832.75 534.93 L 974.66 504.72 L 1051.33 490.87 L 1142.82 475.17 L 1184.21 494.5 L 1188.72 514.15 L 1172.46 554.34 L 1074.6 578.5 L 959.84 601.45 L 788.94 641.88 L 786.85 643.41 L 789.26 646.39 L 866.26 653.64 L 899.19 655.41 L 979.81 655.41 L 1129.93 666.6 L 1169.15 692.54 L 1192.67 724.27 L 1188.72 748.43 L 1128.32 779.19 L 1046.82 759.87 L 856.59 714.6 L 791.36 698.34 L 782.34 698.34 L 782.34 703.73 L 836.7 756.89 L 936.32 846.85 L 1061.07 962.82 L 1067.44 991.49 L 1051.41 1014.12 L 1034.5 1011.7 L 924.89 929.23 L 882.6 892.11 L 786.85 811.49 L 780.48 811.49 L 780.48 819.95 L 802.55 852.24 L 919.09 1027.41 L 925.13 1081.13 L 916.67 1098.6 L 886.47 1109.15 L 853.29 1103.11 L 785.07 1007.36 L 714.68 899.52 L 657.91 802.87 L 650.98 806.82 L 617.48 1167.7 L 601.77 1186.15 L 565.53 1200 L 535.33 1177.05 L 519.3 1139.92 L 535.33 1066.55 L 554.66 970.79 L 570.36 894.68 L 584.54 800.13 L 592.99 768.72 L 592.43 766.63 L 585.5 767.52 L 514.23 865.37 L 405.83 1011.87 L 320.05 1103.68 L 299.52 1111.81 L 263.92 1093.37 L 267.22 1060.43 L 287.11 1031.11 L 405.83 880.11 L 477.42 786.52 L 523.65 732.48 L 523.33 724.67 L 520.59 724.67 L 205.29 929.4 L 149.15 936.64 L 124.99 914.01 L 127.97 876.89 L 139.41 864.81 L 234.2 799.57 Z"/>
    </svg>
  )
}

// Gemini Logo
function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 65 65" className={className} fill="none">
      <defs>
        <linearGradient id="geminiGrad" x1="18.447" y1="43.42" x2="52.153" y2="15.004" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4893FC"/><stop offset="0.27" stopColor="#4893FC"/><stop offset="0.777" stopColor="#969DFF"/><stop offset="1" stopColor="#BD99FE"/>
        </linearGradient>
      </defs>
      <path d="M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z" fill="url(#geminiGrad)"/>
    </svg>
  )
}

// Flash Logo
function FlashLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#FBBC04">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )
}

// 3-point slider
function ThreePointSlider({ value, onChange, labels, color = 'gray' }: { 
  value: number; onChange: (v: number) => void; labels: [string, string, string]; color?: 'orange' | 'blue' | 'gray'
}) {
  const dotColors = { orange: 'bg-orange-500', blue: 'bg-blue-500', gray: 'bg-gray-500' }
  return (
    <div className="w-full">
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-px bg-gray-200" />
        <div className={`absolute h-px ${dotColors[color]} transition-all`} style={{ left: 0, width: value === 1 ? '0%' : value === 2 ? '50%' : '100%' }} />
        {[1, 2, 3].map((v) => (
          <button key={v} onClick={() => onChange(v)} className={`absolute w-2.5 h-2.5 rounded-full border-2 transition-all ${v <= value ? `${dotColors[color]} border-transparent` : 'bg-white border-gray-300 hover:border-gray-400'}`}
            style={{ left: v === 1 ? '0%' : v === 2 ? 'calc(50% - 5px)' : 'calc(100% - 10px)' }} />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-gray-400 -mt-0.5">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  )
}

// 5-point priority selector
function AgentPrioritySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['Claude Only', 'Claude+', 'Neutral', 'Gemini+', 'Gemini Only']
  return (
    <div className="w-full">
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-orange-300 via-gray-200 to-blue-300" />
        {[-2, -1, 0, 1, 2].map((v) => (
          <button key={v} onClick={() => onChange(v)} className={`absolute w-2.5 h-2.5 rounded-full border-2 transition-all ${v === value ? v < 0 ? 'bg-orange-500 border-orange-500' : v > 0 ? 'bg-blue-500 border-blue-500' : 'bg-gray-500 border-gray-500' : 'bg-white border-gray-300 hover:border-gray-400'}`}
            style={{ left: `calc(${(v + 2) * 25}% - 5px)` }} />
        ))}
      </div>
      <div className="flex justify-between text-[7px] text-gray-400 -mt-0.5">
        <span className="text-orange-500">Only</span>
        <span className="text-orange-400">+</span>
        <span>Both</span>
        <span className="text-blue-400">+</span>
        <span className="text-blue-500">Only</span>
      </div>
    </div>
  )
}

// Markdown-ish rendering with tables
function FormattedText({ content }: { content: string }) {
  // Check for table
  if (content.includes('|') && content.includes('---')) {
    const lines = content.split('\n')
    const tableLines: string[] = []
    const otherLines: string[] = []
    let inTable = false
    
    for (const line of lines) {
      if (line.includes('|')) {
        inTable = true
        tableLines.push(line)
      } else if (inTable && line.trim() === '') {
        inTable = false
      } else {
        otherLines.push(line)
      }
    }
    
    if (tableLines.length > 2) {
      const headers = tableLines[0].split('|').filter(c => c.trim())
      const rows = tableLines.slice(2).map(row => row.split('|').filter(c => c.trim()))
      
      return (
        <div>
          {otherLines.length > 0 && <p className="mb-2">{renderInlineFormatting(otherLines.join('\n'))}</p>}
          <table className="text-[10px] border-collapse w-full my-2">
            <thead>
              <tr className="bg-gray-100">
                {headers.map((h, i) => <th key={i} className="border border-gray-200 px-2 py-1 text-left font-medium">{h.trim()}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                  {row.map((cell, j) => <td key={j} className="border border-gray-200 px-2 py-1">{cell.trim()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }
  
  return <span>{renderInlineFormatting(content)}</span>
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-gray-100 px-0.5 rounded text-[10px]">{part.slice(1, -1)}</code>
    return part
  })
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
  const [scribeNotes, setScribeNotes] = useState<ScribeNote[]>([])
  
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentThinking, setCurrentThinking] = useState<{ agent: string; text: string } | null>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [showScribe, setShowScribe] = useState(true)
  const [agentPriority, setAgentPriority] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentThinking])

  // Load/save conversations
  useEffect(() => {
    const saved = localStorage.getItem('lounge-conversations-v3')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConversations(parsed.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
          scribeNotes: (c.scribeNotes || []).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }))
        })))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('lounge-conversations-v3', JSON.stringify(conversations))
    }
  }, [conversations])

  const updateAgentSetting = (agentId: string, key: keyof AgentSettings, value: number) => {
    setAgents(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], settings: { ...prev[agentId].settings, [key]: value } }
    }))
  }

  const addMessage = useCallback((role: Message['role'], content: string, thinking?: string, tokensIn?: number, tokensOut?: number, msgAttachments?: Attachment[]) => {
    const msg: Message = { id: crypto.randomUUID(), role, content, thinking, tokensIn, tokensOut, timestamp: new Date(), attachments: msgAttachments }
    setMessages(prev => [...prev, msg])
    if (activeConversationId) {
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages: [...c.messages, msg] } : c))
    }
    return msg
  }, [activeConversationId])

  const setMessageFeedback = (msgId: string, feedback: 'up' | 'down', msgRole: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m))
    
    // Adjust priority based on feedback
    if (feedback === 'up') {
      if (msgRole === 'claude') setAgentPriority(prev => Math.max(-2, prev - 1))
      if (msgRole === 'gemini') setAgentPriority(prev => Math.min(2, prev + 1))
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const reader = new FileReader()
      
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: isImage ? 'image' : 'file',
          name: file.name,
          url: URL.createObjectURL(file),
          base64
        }
        setAttachments(prev => [...prev, attachment])
      }
      
      reader.readAsDataURL(file)
    }
    
    e.target.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const startNewConversation = () => {
    const newConv: Conversation = { id: crypto.randomUUID(), title: 'New conversation', messages: [], scribeNotes: [], createdAt: new Date() }
    setConversations(prev => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setMessages([])
    setScribeNotes([])
    setAgents({
      claude: { name: 'Claude', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, isRefreshed: false, refreshCount: 0 },
      gemini: { name: 'Gemini', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, isRefreshed: false, refreshCount: 0 }
    })
  }

  const loadConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id)
    setMessages(conv.messages)
    setScribeNotes(conv.scribeNotes || [])
  }

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachments.length === 0) || isProcessing) return
    
    if (!activeConversationId) {
      const title = input.trim().slice(0, 40) || 'Image conversation'
      const newConv: Conversation = { id: crypto.randomUUID(), title: title + (input.length > 40 ? '...' : ''), messages: [], scribeNotes: [], createdAt: new Date() }
      setConversations(prev => [newConv, ...prev])
      setActiveConversationId(newConv.id)
    }
    
    await sendMessage(input.trim())
  }

  const handlePoke = async (agentId: string) => {
    if (isProcessing) return
    // Set priority to favor the poked agent
    setAgentPriority(agentId === 'claude' ? -2 : 2)
    await sendMessage(`Please elaborate on your last point.`, true)
  }

  const handleHush = () => {
    abortControllerRef.current?.abort()
    setIsProcessing(false)
    setCurrentThinking(null)
    setActiveAgent(null)
  }

  const sendMessage = async (messageText: string, isPoke = false) => {
    const currentAttachments = [...attachments]
    setInput('')
    setAttachments([])
    setIsProcessing(true)
    
    // Build message content with attachments
    let fullContent = messageText
    if (currentAttachments.length > 0) {
      const attachmentDescs = currentAttachments.map(a => a.type === 'image' ? `[Image: ${a.name}]` : `[File: ${a.name}]`).join(' ')
      fullContent = `${attachmentDescs} ${messageText}`.trim()
    }
    
    if (!isPoke) addMessage('user', fullContent, undefined, undefined, undefined, currentAttachments)

    abortControllerRef.current = new AbortController()

    try {
      const scribeContext = scribeNotes.map(n => n.content).join('\n\n')
      
      const response = await fetch('/api/lounge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: fullContent }],
          agents: { claude: agents.claude.settings, gemini: agents.gemini.settings },
          bias: agentPriority,
          scribeContext,
          refreshedAgents: { claude: agents.claude.isRefreshed, gemini: agents.gemini.isRefreshed },
          attachments: currentAttachments.map(a => ({ type: a.type, name: a.name, base64: a.base64 }))
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
              
              const agentKey = data.agent as 'claude' | 'gemini'
              setAgents(prev => ({
                ...prev,
                [agentKey]: {
                  ...prev[agentKey],
                  tokensIn: prev[agentKey].tokensIn + (data.tokens?.in || 0),
                  tokensOut: prev[agentKey].tokensOut + (data.tokens?.out || 0),
                  isRefreshed: false
                }
              }))
              setActiveAgent(null)
            } else if (data.type === 'scribe') {
              const newNote: ScribeNote = { timestamp: new Date(), content: data.content }
              setScribeNotes(prev => [...prev, newNote])
              if (activeConversationId) {
                setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, scribeNotes: [...c.scribeNotes, newNote] } : c))
              }
            }
          } catch {}
        }
      }
      
      // Reset priority back to neutral after poke
      if (isPoke) {
        setAgentPriority(0)
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
          <button onClick={() => router.push('/settings')} className="p-1.5 hover:bg-gray-100 rounded"><Settings className="w-3.5 h-3.5" /></button>
          <SignOutButton><button className="p-1.5 hover:bg-gray-100 rounded"><LogOut className="w-3.5 h-3.5" /></button></SignOutButton>
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
              <button key={conv.id} onClick={() => loadConversation(conv)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-50 ${activeConversationId === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
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
                <p className="text-[10px] mt-1">Attach images or files to discuss</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                  {msg.role === 'system' ? (
                    <div className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</div>
                  ) : (
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${msg.role === 'user' ? 'bg-gray-800 text-white' : msg.role === 'claude' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
                      {msg.role !== 'user' && (
                        <div className={`text-[10px] font-medium mb-1 flex items-center gap-1.5 ${msg.role === 'claude' ? 'text-orange-600' : 'text-blue-600'}`}>
                          {msg.role === 'claude' ? <ClaudeLogo className="w-3.5 h-3.5" /> : <GeminiLogo className="w-3.5 h-3.5" />}
                          {msg.role === 'claude' ? 'Claude' : 'Gemini'}
                          <span className="text-gray-400 font-normal flex items-center gap-0.5 ml-auto">
                            <Clock className="w-2.5 h-2.5" />{formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex gap-1 mb-2 flex-wrap">
                          {msg.attachments.map(att => (
                            <div key={att.id} className="relative">
                              {att.type === 'image' ? (
                                <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg" />
                              ) : (
                                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-[10px]">
                                  <FileText className="w-3 h-3" />{att.name}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs leading-relaxed whitespace-pre-wrap">
                        <FormattedText content={msg.content} />
                      </div>
                      
                      {msg.role !== 'user' && (
                        <div className="flex items-center gap-0.5 mt-1.5 pt-1.5 border-t border-black/5">
                          <button onClick={() => copyMessage(msg.content, msg.id)} className="p-1 hover:bg-black/5 rounded text-gray-400 hover:text-gray-600">
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button onClick={() => setMessageFeedback(msg.id, 'up', msg.role)} className={`p-1 hover:bg-black/5 rounded ${msg.feedback === 'up' ? 'text-green-500' : 'text-gray-400 hover:text-green-600'}`}>
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button onClick={() => setMessageFeedback(msg.id, 'down', msg.role)} className={`p-1 hover:bg-black/5 rounded ${msg.feedback === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-red-600'}`}>
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

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 flex gap-2 flex-wrap">
              {attachments.map(att => (
                <div key={att.id} className="relative group">
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <button onClick={() => removeAttachment(att.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*,.pdf,.txt,.md,.csv" className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-2 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <Paperclip className="w-4 h-4" />
              </button>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message..." className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" disabled={isProcessing} />
              {isProcessing ? (
                <button type="button" onClick={handleHush} className="px-3 py-2 bg-red-500 text-white rounded-lg"><Square className="w-4 h-4" /></button>
              ) : (
                <button type="submit" disabled={!input.trim() && attachments.length === 0} className="px-3 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-40"><Send className="w-4 h-4" /></button>
              )}
            </div>
          </form>
        </div>

        {/* Right - Controls */}
        <div className="w-52 border-l border-gray-200 bg-white flex flex-col text-xs overflow-y-auto">
          {/* Priority */}
          <div className="p-3 border-b border-gray-100">
            <div className="text-[9px] font-medium text-gray-400 uppercase tracking-wide mb-2">Agent Priority</div>
            <AgentPrioritySelector value={agentPriority} onChange={setAgentPriority} />
          </div>

          {/* Agent Controls */}
          <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
            {Object.entries(agents).map(([id, agent]) => {
              const color = id === 'claude' ? 'orange' : 'blue' as const
              const energy = getEnergy(agent.tokensIn, agent.tokensOut, id as 'claude' | 'gemini')
              
              return (
                <div key={id} className={`p-2 rounded-lg border ${activeAgent === id ? id === 'claude' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {id === 'claude' ? <ClaudeLogo className="w-4 h-4" /> : <GeminiLogo className="w-4 h-4" />}
                      <span className={`font-medium text-[11px] ${id === 'claude' ? 'text-orange-700' : 'text-blue-700'}`}>{agent.name}</span>
                    </div>
                    <button onClick={() => handlePoke(id)} disabled={isProcessing} className="text-[8px] px-1.5 py-0.5 rounded bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Poke</button>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-[8px] text-gray-500 mb-0.5"><span>Energy</span><span>{energy.toFixed(0)}%</span></div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${energy > 50 ? 'bg-green-500' : energy > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${energy}%` }} />
                    </div>
                    <div className="text-[7px] text-gray-400 mt-0.5">{(agent.tokensIn + agent.tokensOut).toLocaleString()} tokens</div>
                  </div>

                  <div className="space-y-2">
                    <div><div className="text-[8px] text-gray-500 mb-0.5">Verbosity</div><ThreePointSlider value={agent.settings.verbosity} onChange={(v) => updateAgentSetting(id, 'verbosity', v)} labels={['Brief', 'Medium', 'Full']} color={color} /></div>
                    <div><div className="text-[8px] text-gray-500 mb-0.5">Creativity</div><ThreePointSlider value={agent.settings.creativity} onChange={(v) => updateAgentSetting(id, 'creativity', v)} labels={['Factual', 'Balanced', 'Creative']} color={color} /></div>
                    <div><div className="text-[8px] text-gray-500 mb-0.5">Tension</div><ThreePointSlider value={agent.settings.tension} onChange={(v) => updateAgentSetting(id, 'tension', v)} labels={['Chill', 'Medium', 'Spicy']} color={color} /></div>
                    <div><div className="text-[8px] text-gray-500 mb-0.5">Speed</div><ThreePointSlider value={agent.settings.speed} onChange={(v) => updateAgentSetting(id, 'speed', v)} labels={['Deep', 'Medium', 'Fast']} color={color} /></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scribe */}
          <div className="border-t border-gray-100 p-2">
            <button onClick={() => setShowScribe(!showScribe)} className="w-full flex items-center justify-between text-[9px] font-medium text-gray-500">
              <span className="flex items-center gap-1"><FlashLogo className="w-3 h-3" />Scribe ({scribeNotes.length})</span>
              {showScribe ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
            {showScribe && scribeNotes.length > 0 && (
              <div className="mt-1.5 max-h-32 overflow-y-auto space-y-1.5">
                {scribeNotes.map((note, i) => (
                  <div key={i} className="text-[9px] text-gray-600 bg-yellow-50 rounded p-2 leading-relaxed">
                    <div className="text-[8px] text-yellow-600 mb-1">{formatTime(note.timestamp)}</div>
                    <FormattedText content={note.content} />
                  </div>
                ))}
              </div>
            )}
            {showScribe && scribeNotes.length === 0 && (
              <div className="mt-1.5 text-[8px] text-gray-400 italic">Notes will appear as conversation develops...</div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
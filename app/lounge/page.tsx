'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  MessageSquare, LogOut, Settings, Send, Square,
  Copy, ThumbsUp, ThumbsDown, Plus, Clock, ChevronDown, ChevronUp, Check,
  Paperclip, X, FileText, ExternalLink, RotateCcw, Share2,
  PanelLeftClose, PanelLeft, Monitor, Smartphone, BarChart3, PhoneOff
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
  model?: string
  modelId?: string
  tokensIn?: number
  tokensOut?: number
  cost?: number
  timestamp: Date
  feedback?: 'up' | 'down'
  attachments?: Attachment[]
}

interface ScribeNote {
  timestamp: Date
  content: string
}

interface Session {
  id: string
  startedAt: Date
  endedAt?: Date
  messageCount: number
  claudeCost: number
  geminiCost: number
  totalCost: number
}

interface ConversationStats {
  totalMessages: number
  userMessages: number
  claudeMessages: number
  geminiMessages: number
  claudeTokensIn: number
  claudeTokensOut: number
  geminiTokensIn: number
  geminiTokensOut: number
  claudeCost: number
  geminiCost: number
  totalCost: number
  totalDuration: number
  sessions: Session[]
  modelsUsed: string[]
  deviceType: 'desktop' | 'mobile'
  topic?: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  scribeNotes: ScribeNote[]
  stats?: ConversationStats
  sessions: Session[]
  isEnded: boolean
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
  cost: number
  isRefreshed: boolean
  refreshCount: number
}

const defaultSettings: AgentSettings = { verbosity: 2, creativity: 2, tension: 2, speed: 2 }

function getDeviceType(): 'desktop' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop'
  return window.innerWidth < 768 ? 'mobile' : 'desktop'
}

// Logos
function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1200 1200" className={className} fill="#d97757">
      <path d="M 233.96 800.21 L 468.64 668.54 L 472.59 657.1 L 468.64 650.74 L 457.21 650.74 L 417.99 648.32 L 283.89 644.7 L 167.6 639.87 L 54.93 633.83 L 26.58 627.79 L 0 592.75 L 2.74 575.28 L 26.58 559.25 L 60.72 562.23 L 136.19 567.38 L 249.42 575.19 L 331.57 580.03 L 453.26 592.67 L 472.59 592.67 L 475.33 584.86 L 468.72 580.03 L 463.57 575.19 L 346.39 495.79 L 219.54 411.87 L 153.1 363.54 L 117.18 339.06 L 99.06 316.11 L 91.25 266.01 L 123.87 230.09 L 167.68 233.07 L 178.87 236.05 L 223.25 270.2 L 318.04 343.57 L 441.83 434.74 L 459.95 449.8 L 467.19 444.64 L 468.08 441.02 L 459.95 427.41 L 392.62 305.72 L 320.78 181.93 L 288.81 130.63 L 280.35 99.87 C 277.37 87.22 275.19 76.59 275.19 63.62 L 312.32 13.21 L 332.86 6.6 L 382.39 13.21 L 403.25 31.33 L 434.01 101.72 L 483.87 212.54 L 561.18 363.22 L 583.81 407.92 L 595.89 449.32 L 600.4 461.96 L 608.21 461.96 L 608.21 454.71 L 614.58 369.83 L 626.34 265.61 L 637.77 131.52 L 641.72 93.75 L 660.4 48.48 L 697.53 24 L 726.52 37.85 L 750.36 72 L 747.06 94.07 L 732.89 186.2 L 705.1 330.52 L 686.98 427.17 L 697.53 427.17 L 709.61 415.09 L 758.5 350.17 L 840.64 247.49 L 876.89 206.74 L 919.17 161.72 L 946.31 140.3 L 997.61 140.3 L 1035.38 196.43 L 1018.47 254.42 L 965.64 321.42 L 921.83 378.2 L 859.01 462.77 L 819.79 530.42 L 823.41 535.81 L 832.75 534.93 L 974.66 504.72 L 1051.33 490.87 L 1142.82 475.17 L 1184.21 494.5 L 1188.72 514.15 L 1172.46 554.34 L 1074.6 578.5 L 959.84 601.45 L 788.94 641.88 L 786.85 643.41 L 789.26 646.39 L 866.26 653.64 L 899.19 655.41 L 979.81 655.41 L 1129.93 666.6 L 1169.15 692.54 L 1192.67 724.27 L 1188.72 748.43 L 1128.32 779.19 L 1046.82 759.87 L 856.59 714.6 L 791.36 698.34 L 782.34 698.34 L 782.34 703.73 L 836.7 756.89 L 936.32 846.85 L 1061.07 962.82 L 1067.44 991.49 L 1051.41 1014.12 L 1034.5 1011.7 L 924.89 929.23 L 882.6 892.11 L 786.85 811.49 L 780.48 811.49 L 780.48 819.95 L 802.55 852.24 L 919.09 1027.41 L 925.13 1081.13 L 916.67 1098.6 L 886.47 1109.15 L 853.29 1103.11 L 785.07 1007.36 L 714.68 899.52 L 657.91 802.87 L 650.98 806.82 L 617.48 1167.7 L 601.77 1186.15 L 565.53 1200 L 535.33 1177.05 L 519.3 1139.92 L 535.33 1066.55 L 554.66 970.79 L 570.36 894.68 L 584.54 800.13 L 592.99 768.72 L 592.43 766.63 L 585.5 767.52 L 514.23 865.37 L 405.83 1011.87 L 320.05 1103.68 L 299.52 1111.81 L 263.92 1093.37 L 267.22 1060.43 L 287.11 1031.11 L 405.83 880.11 L 477.42 786.52 L 523.65 732.48 L 523.33 724.67 L 520.59 724.67 L 205.29 929.4 L 149.15 936.64 L 124.99 914.01 L 127.97 876.89 L 139.41 864.81 L 234.2 799.57 Z"/>
    </svg>
  )
}

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
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-px bg-gray-200" />
        <div className={`absolute h-px ${dotColors[color]} transition-all`} style={{ left: 0, width: value === 1 ? '0%' : value === 2 ? '50%' : '100%' }} />
        {[1, 2, 3].map((v) => (
          <button key={v} onClick={() => onChange(v)} className={`absolute w-3 h-3 rounded-full border-2 transition-all ${v <= value ? `${dotColors[color]} border-transparent` : 'bg-white border-gray-300 hover:border-gray-400'}`}
            style={{ left: v === 1 ? '0%' : v === 2 ? 'calc(50% - 6px)' : 'calc(100% - 12px)' }} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">{labels.map((l, i) => <span key={i}>{l}</span>)}</div>
    </div>
  )
}

// 5-point priority
function AgentPrioritySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="w-full">
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-orange-300 via-gray-200 to-blue-300" />
        {[-2, -1, 0, 1, 2].map((v) => (
          <button key={v} onClick={() => onChange(v)} className={`absolute w-3 h-3 rounded-full border-2 transition-all ${v === value ? v < 0 ? 'bg-orange-500 border-orange-500' : v > 0 ? 'bg-blue-500 border-blue-500' : 'bg-gray-500 border-gray-500' : 'bg-white border-gray-300 hover:border-gray-400'}`}
            style={{ left: `calc(${(v + 2) * 25}% - 6px)` }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
        <span className="text-orange-500">Only</span><span className="text-orange-400">+</span><span>Both</span><span className="text-blue-400">+</span><span className="text-blue-500">Only</span>
      </div>
    </div>
  )
}

// Code block
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative my-2 rounded-lg overflow-hidden bg-gray-900 text-gray-100">
      <div className="flex justify-between items-center px-3 py-1.5 bg-gray-800 text-xs">
        <span className="text-gray-400">{language || 'code'}</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="flex items-center gap-1 text-gray-400 hover:text-white">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm leading-relaxed"><code>{code}</code></pre>
    </div>
  )
}

// Rich text
function FormattedText({ content }: { content: string }) {
  const elements: React.ReactNode[] = []
  let remaining = content, key = 0
  while (remaining.length > 0) {
    const codeBlockMatch = remaining.match(/^```(\w*)\n?([\s\S]*?)```/)
    if (codeBlockMatch) { elements.push(<CodeBlock key={key++} code={codeBlockMatch[2].trim()} language={codeBlockMatch[1]} />); remaining = remaining.slice(codeBlockMatch[0].length); continue }
    const tableMatch = remaining.match(/^(\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+)/)
    if (tableMatch) {
      const lines = tableMatch[1].trim().split('\n'), headers = lines[0].split('|').filter(c => c.trim()), rows = lines.slice(2).map(row => row.split('|').filter(c => c.trim()))
      elements.push(<table key={key++} className="text-sm border-collapse w-full my-2"><thead><tr className="bg-gray-100">{headers.map((h, i) => <th key={i} className="border border-gray-200 px-3 py-1.5 text-left font-medium">{h.trim()}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>{row.map((cell, j) => <td key={j} className="border border-gray-200 px-3 py-1.5">{cell.trim()}</td>)}</tr>)}</tbody></table>)
      remaining = remaining.slice(tableMatch[0].length); continue
    }
    const nextCode = remaining.indexOf('```'), nextTable = remaining.search(/\n\|[^\n]+\|/)
    let nextBreak = remaining.length
    if (nextCode !== -1 && nextCode < nextBreak) nextBreak = nextCode
    if (nextTable !== -1 && nextTable < nextBreak) nextBreak = nextTable + 1
    const textChunk = remaining.slice(0, nextBreak)
    if (textChunk) elements.push(<span key={key++}>{renderInlineFormatting(textChunk)}</span>)
    remaining = remaining.slice(nextBreak)
  }
  return <>{elements}</>
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g).map((part, i) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">{linkMatch[1]}<ExternalLink className="w-3 h-3" /></a>
    return part
  }).filter(Boolean)
}

function formatTime(date: Date): string { return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }
function formatDuration(minutes: number): string { return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m` }
function formatCost(cost: number): string { 
  if (cost < 0.01) return 'near zero'
  return `$${cost.toFixed(2)}` 
}

// Stats Modal
function StatsModal({ stats, topic, onClose }: { stats: ConversationStats; topic: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Stats for Nerds</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        
        {topic && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <div className="text-xs font-medium text-blue-600 mb-1">Topic</div>
            <div className="text-sm text-gray-800">{topic}</div>
          </div>
        )}
        
        <div className="space-y-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-2">Overview</div>
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>Messages: <span className="font-medium text-gray-900">{stats.totalMessages}</span></div>
              <div>Sessions: <span className="font-medium text-gray-900">{stats.sessions.length}</span></div>
              <div>Duration: <span className="font-medium text-gray-900">{formatDuration(stats.totalDuration)}</span></div>
              <div className="flex items-center gap-1">Device: {stats.deviceType === 'desktop' ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}<span className="font-medium text-gray-900 capitalize">{stats.deviceType}</span></div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="font-medium text-green-700 mb-2">Estimated Cost</div>
            <div className="space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold text-green-700">{stats.totalCost < 0.01 ? 'Near zero' : `$${stats.totalCost.toFixed(3)}`}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1"><ClaudeLogo className="w-3 h-3" /> Claude:</span>
                <span>{stats.claudeCost < 0.001 ? '~$0' : `$${stats.claudeCost.toFixed(4)}`}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1"><GeminiLogo className="w-3 h-3" /> Gemini:</span>
                <span>{stats.geminiCost < 0.001 ? '~$0' : `$${stats.geminiCost.toFixed(4)}`}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="font-medium text-gray-700 mb-2">Messages</div>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-200 rounded p-2 text-center">
                <div className="text-xl font-bold">{stats.userMessages}</div>
                <div className="text-xs text-gray-500">You</div>
              </div>
              <div className="flex-1 bg-orange-100 rounded p-2 text-center">
                <div className="text-xl font-bold text-orange-600">{stats.claudeMessages}</div>
                <div className="text-xs text-orange-500">Claude</div>
              </div>
              <div className="flex-1 bg-blue-100 rounded p-2 text-center">
                <div className="text-xl font-bold text-blue-600">{stats.geminiMessages}</div>
                <div className="text-xs text-blue-500">Gemini</div>
              </div>
            </div>
          </div>
          
          {stats.modelsUsed.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="font-medium text-purple-700 mb-2">Models Used</div>
              <div className="flex flex-wrap gap-1.5">
                {stats.modelsUsed.map((model, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{model}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const STORAGE_KEY = 'lounge-data-v7'
const SCRIBE_MODEL = 'Gemini 3 Flash'

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
  const [scribeCopied, setScribeCopied] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [isConversationEnded, setIsConversationEnded] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    claude: { name: 'Claude', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, cost: 0, isRefreshed: false, refreshCount: 0 },
    gemini: { name: 'Gemini', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, cost: 0, isRefreshed: false, refreshCount: 0 }
  })

  const getEnergy = (tokensIn: number, tokensOut: number, model: 'claude' | 'gemini') => {
    const contextWindow = model === 'claude' ? 200000 : 1000000
    return Math.max(0, 100 - ((tokensIn + tokensOut) / contextWindow) * 100)
  }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, currentThinking])

  // Load
  useEffect(() => {
    if (!user?.id) return
    const saved = localStorage.getItem(`${STORAGE_KEY}-${user.id}`)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        const convs = data.conversations?.map((c: any) => ({
          ...c, createdAt: new Date(c.createdAt),
          messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
          scribeNotes: (c.scribeNotes || []).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })),
          sessions: (c.sessions || []).map((s: any) => ({ ...s, startedAt: new Date(s.startedAt), endedAt: s.endedAt ? new Date(s.endedAt) : undefined }))
        })) || []
        setConversations(convs)
        if (data.activeConversationId) {
          const active = convs.find((c: Conversation) => c.id === data.activeConversationId)
          if (active) { setActiveConversationId(active.id); setMessages(active.messages); setScribeNotes(active.scribeNotes || []); setIsConversationEnded(active.isEnded || false) }
        }
      } catch (e) { console.error('Load error:', e) }
    }
  }, [user?.id])

  // Save
  useEffect(() => {
    if (!user?.id || conversations.length === 0) return
    localStorage.setItem(`${STORAGE_KEY}-${user.id}`, JSON.stringify({ conversations, activeConversationId }))
  }, [conversations, activeConversationId, user?.id])

  // Sync
  useEffect(() => {
    if (!activeConversationId) return
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages, scribeNotes, isEnded: isConversationEnded } : c))
  }, [messages, scribeNotes, activeConversationId, isConversationEnded])

  const calculateStats = useCallback((): ConversationStats => {
    const claudeMsgs = messages.filter(m => m.role === 'claude')
    const geminiMsgs = messages.filter(m => m.role === 'gemini')
    const userMsgs = messages.filter(m => m.role === 'user')
    const modelsUsed = [...new Set([...claudeMsgs.map(m => m.model), ...geminiMsgs.map(m => m.model)].filter(Boolean))] as string[]
    const currentConv = conversations.find(c => c.id === activeConversationId)
    const sessions = currentConv?.sessions || []
    const totalDuration = sessions.reduce((sum, s) => sum + Math.round(((s.endedAt || new Date()).getTime() - s.startedAt.getTime()) / 60000), 0)
    
    return {
      totalMessages: messages.length,
      userMessages: userMsgs.length,
      claudeMessages: claudeMsgs.length,
      geminiMessages: geminiMsgs.length,
      claudeTokensIn: claudeMsgs.reduce((sum, m) => sum + (m.tokensIn || 0), 0),
      claudeTokensOut: claudeMsgs.reduce((sum, m) => sum + (m.tokensOut || 0), 0),
      geminiTokensIn: geminiMsgs.reduce((sum, m) => sum + (m.tokensIn || 0), 0),
      geminiTokensOut: geminiMsgs.reduce((sum, m) => sum + (m.tokensOut || 0), 0),
      claudeCost: claudeMsgs.reduce((sum, m) => sum + (m.cost || 0), 0),
      geminiCost: geminiMsgs.reduce((sum, m) => sum + (m.cost || 0), 0),
      totalCost: messages.reduce((sum, m) => sum + (m.cost || 0), 0),
      totalDuration,
      sessions,
      modelsUsed,
      deviceType: getDeviceType(),
      topic: currentConv?.title
    }
  }, [messages, conversations, activeConversationId])

  const updateAgentSetting = (agentId: string, key: keyof AgentSettings, value: number) => {
    setAgents(prev => ({ ...prev, [agentId]: { ...prev[agentId], settings: { ...prev[agentId].settings, [key]: value } } }))
  }

  const addMessage = useCallback((role: Message['role'], content: string, thinking?: string, model?: string, modelId?: string, tokensIn?: number, tokensOut?: number, cost?: number, msgAttachments?: Attachment[]) => {
    const msg: Message = { id: crypto.randomUUID(), role, content, thinking, model, modelId, tokensIn, tokensOut, cost, timestamp: new Date(), attachments: msgAttachments }
    setMessages(prev => [...prev, msg])
    return msg
  }, [])

  const setMessageFeedback = (msgId: string, feedback: 'up' | 'down', msgRole: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m))
    if (feedback === 'up') {
      if (msgRole === 'claude') setAgentPriority(prev => Math.max(-2, prev - 1))
      if (msgRole === 'gemini') setAgentPriority(prev => Math.min(2, prev + 1))
    }
  }

  const endCurrentSession = useCallback(() => {
    if (!currentSessionId || !sessionStartTime) return
    const session: Session = {
      id: currentSessionId, startedAt: sessionStartTime, endedAt: new Date(),
      messageCount: messages.length,
      claudeCost: messages.filter(m => m.role === 'claude').reduce((sum, m) => sum + (m.cost || 0), 0),
      geminiCost: messages.filter(m => m.role === 'gemini').reduce((sum, m) => sum + (m.cost || 0), 0),
      totalCost: messages.reduce((sum, m) => sum + (m.cost || 0), 0)
    }
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, sessions: [...(c.sessions || []), session] } : c))
    setCurrentSessionId(null)
    setSessionStartTime(null)
  }, [currentSessionId, sessionStartTime, messages, activeConversationId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image/')
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAttachments(prev => [...prev, { id: crypto.randomUUID(), type: isImage ? 'image' : 'file', name: file.name, url: URL.createObjectURL(file), base64 }])
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const endConversation = () => {
    endCurrentSession()
    setIsConversationEnded(true)
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, isEnded: true, stats: calculateStats() } : c))
  }

  const startNewConversation = (resumeFromScribe?: string) => {
    if (activeConversationId && messages.length > 0 && !isConversationEnded) endConversation()
    const newConv: Conversation = { 
      id: crypto.randomUUID(), 
      title: resumeFromScribe ? 'Resumed conversation' : 'New conversation', 
      messages: [], 
      scribeNotes: resumeFromScribe ? [{ timestamp: new Date(), content: `**Resumed:**\n${resumeFromScribe}` }] : [], 
      sessions: [], isEnded: false, createdAt: new Date() 
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setMessages([])
    setScribeNotes(resumeFromScribe ? [{ timestamp: new Date(), content: `**Resumed:**\n${resumeFromScribe}` }] : [])
    setIsConversationEnded(false)
    setCurrentSessionId(crypto.randomUUID())
    setSessionStartTime(new Date())
    setAgents({
      claude: { name: 'Claude', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, cost: 0, isRefreshed: !!resumeFromScribe, refreshCount: 0 },
      gemini: { name: 'Gemini', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0, cost: 0, isRefreshed: !!resumeFromScribe, refreshCount: 0 }
    })
  }

  const resumeConversation = () => {
    setIsConversationEnded(false)
    setCurrentSessionId(crypto.randomUUID())
    setSessionStartTime(new Date())
    setAgents({
      claude: { ...agents.claude, tokensIn: 0, tokensOut: 0, cost: 0, isRefreshed: true, refreshCount: agents.claude.refreshCount + 1 },
      gemini: { ...agents.gemini, tokensIn: 0, tokensOut: 0, cost: 0, isRefreshed: true, refreshCount: agents.gemini.refreshCount + 1 }
    })
    addMessage('system', '🔄 Fresh agents have joined and read the scribe notes.')
  }

  const loadConversation = (conv: Conversation) => {
    if (activeConversationId && messages.length > 0 && !isConversationEnded) endConversation()
    setActiveConversationId(conv.id)
    setMessages(conv.messages)
    setScribeNotes(conv.scribeNotes || [])
    setIsConversationEnded(conv.isEnded || false)
    if (!conv.isEnded) { setCurrentSessionId(crypto.randomUUID()); setSessionStartTime(new Date()) }
  }

  const shareConversation = async () => {
    const shareText = messages.filter(m => m.role !== 'system').map(m => 
      `${m.role === 'user' ? 'You' : m.role === 'claude' ? `Claude (${m.model})` : `Gemini (${m.model})`}: ${m.content}`
    ).join('\n\n---\n\n')
    
    if (navigator.share) {
      try { await navigator.share({ title: conversations.find(c => c.id === activeConversationId)?.title, text: shareText }) } catch {}
    } else {
      navigator.clipboard.writeText(shareText)
      alert('Copied to clipboard!')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachments.length === 0) || isProcessing || isConversationEnded) return
    if (!currentSessionId) { setCurrentSessionId(crypto.randomUUID()); setSessionStartTime(new Date()) }
    if (!activeConversationId) {
      const title = input.trim().slice(0, 50) || 'New chat'
      const newConv: Conversation = { id: crypto.randomUUID(), title, messages: [], scribeNotes: [], sessions: [], isEnded: false, createdAt: new Date() }
      setConversations(prev => [newConv, ...prev])
      setActiveConversationId(newConv.id)
    } else {
      // Update title if first message
      if (messages.length === 0) {
        const title = input.trim().slice(0, 50)
        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title } : c))
      }
    }
    await sendMessage(input.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) }
  }

  const handlePoke = async (agentId: string) => {
    if (isProcessing || isConversationEnded) return
    setAgentPriority(agentId === 'claude' ? -2 : 2)
    await sendMessage('Please elaborate.', true)
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
    
    let fullContent = messageText
    if (currentAttachments.length > 0) fullContent = `${currentAttachments.map(a => `[${a.type === 'image' ? 'Image' : 'File'}: ${a.name}]`).join(' ')} ${messageText}`.trim()
    if (!isPoke) addMessage('user', fullContent, undefined, undefined, undefined, undefined, undefined, undefined, currentAttachments)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/lounge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: fullContent }],
          agents: { claude: agents.claude.settings, gemini: agents.gemini.settings },
          bias: agentPriority,
          scribeContext: scribeNotes.map(n => n.content).join('\n\n'),
          refreshedAgents: { claude: agents.claude.isRefreshed, gemini: agents.gemini.isRefreshed }
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok || !response.body) throw new Error('Failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'thinking') { setActiveAgent(data.agent); setCurrentThinking({ agent: data.agent, text: data.content }) }
            else if (data.type === 'complete') {
              setCurrentThinking(null)
              addMessage(data.agent, data.content, data.thinking, data.model, data.modelId, data.tokens?.in, data.tokens?.out, data.cost)
              const agentKey = data.agent as 'claude' | 'gemini'
              setAgents(prev => ({
                ...prev,
                [agentKey]: { ...prev[agentKey], tokensIn: prev[agentKey].tokensIn + (data.tokens?.in || 0), tokensOut: prev[agentKey].tokensOut + (data.tokens?.out || 0), cost: prev[agentKey].cost + (data.cost || 0), isRefreshed: false }
              }))
              setActiveAgent(null)
            } else if (data.type === 'scribe') {
              setScribeNotes(prev => [...prev, { timestamp: new Date(), content: data.content }])
            }
          } catch {}
        }
      }
      if (isPoke) setAgentPriority(0)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') addMessage('system', 'Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
      setCurrentThinking(null)
      setActiveAgent(null)
    }
  }

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>

  const currentStats = calculateStats()

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {showStats && <StatsModal stats={currentStats} topic={conversations.find(c => c.id === activeConversationId)?.title || ''} onClose={() => setShowStats(false)} />}
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 hover:bg-gray-100 rounded">
            {sidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 via-purple-500 to-blue-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800">Lounge</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button onClick={shareConversation} className="p-2 hover:bg-gray-100 rounded" title="Share"><Share2 className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setShowStats(true)} className="p-2 hover:bg-gray-100 rounded" title="Stats"><BarChart3 className="w-4 h-4 text-gray-500" /></button>
            </>
          )}
          <span className="text-sm text-gray-500">{user?.firstName}</span>
          <button onClick={() => router.push('/settings')} className="p-2 hover:bg-gray-100 rounded"><Settings className="w-4 h-4 text-gray-500" /></button>
          <SignOutButton><button className="p-2 hover:bg-gray-100 rounded"><LogOut className="w-4 h-4 text-gray-500" /></button></SignOutButton>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-56'} transition-all duration-200 border-r border-gray-200 bg-white flex flex-col overflow-hidden`}>
          <div className="p-3">
            <button onClick={() => startNewConversation()} className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
              <Plus className="w-4 h-4" /> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => loadConversation(conv)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 ${activeConversationId === conv.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                <div className="font-medium text-gray-700 truncate">{conv.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{conv.messages.length} messages {conv.isEnded && '• ended'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-base">Start a conversation</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
                    {msg.role === 'system' ? (
                      <div className="text-sm text-gray-400 bg-gray-100 px-4 py-1.5 rounded-full">{msg.content}</div>
                    ) : (
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-gray-800 text-white' : msg.role === 'claude' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
                        {msg.role !== 'user' && (
                          <div className={`text-xs font-medium mb-2 flex items-center gap-2 ${msg.role === 'claude' ? 'text-orange-600' : 'text-blue-600'}`}>
                            {msg.role === 'claude' ? <ClaudeLogo className="w-4 h-4" /> : <GeminiLogo className="w-4 h-4" />}
                            {msg.role === 'claude' ? 'Claude' : 'Gemini'}
                            {msg.model && <span className="text-gray-400 font-normal">({msg.model})</span>}
                            <span className="text-gray-400 font-normal flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{formatTime(msg.timestamp)}</span>
                          </div>
                        )}
                        {msg.attachments?.map(att => (
                          <div key={att.id} className="mb-2">{att.type === 'image' ? <img src={att.url} alt={att.name} className="max-w-[250px] rounded-lg" /> : <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded text-sm"><FileText className="w-4 h-4" />{att.name}</div>}</div>
                        ))}
                        <div className="text-sm leading-relaxed"><FormattedText content={msg.content} /></div>
                        {msg.role !== 'user' && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-black/5">
                            <button onClick={() => { navigator.clipboard.writeText(msg.content); setCopiedId(msg.id); setTimeout(() => setCopiedId(null), 2000) }} className="p-1.5 hover:bg-black/5 rounded text-gray-400 hover:text-gray-600">
                              {copiedId === msg.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setMessageFeedback(msg.id, 'up', msg.role)} className={`p-1.5 hover:bg-black/5 rounded ${msg.feedback === 'up' ? 'text-green-500' : 'text-gray-400'}`}><ThumbsUp className="w-4 h-4" /></button>
                            <button onClick={() => setMessageFeedback(msg.id, 'down', msg.role)} className={`p-1.5 hover:bg-black/5 rounded ${msg.feedback === 'down' ? 'text-red-500' : 'text-gray-400'}`}><ThumbsDown className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {isConversationEnded && (
                  <div className="bg-gray-100 rounded-2xl p-5 text-center space-y-3">
                    <div className="text-base font-medium text-gray-700">Conversation Ended</div>
                    <div className="text-sm text-gray-500">
                      <div className="font-medium">{conversations.find(c => c.id === activeConversationId)?.title}</div>
                      <div className="mt-2">{currentStats.totalMessages} messages • {formatDuration(currentStats.totalDuration)} • {currentStats.sessions.length} session(s)</div>
                      <div className="mt-1 text-green-600">Estimated cost: {currentStats.totalCost < 0.01 ? 'near zero' : `$${currentStats.totalCost.toFixed(3)}`}</div>
                      <div className="text-xs text-gray-400 mt-1">(Claude: {currentStats.claudeCost < 0.01 ? '~$0' : `$${currentStats.claudeCost.toFixed(3)}`}, Gemini: {currentStats.geminiCost < 0.01 ? '~$0' : `$${currentStats.geminiCost.toFixed(3)}`})</div>
                      {currentStats.modelsUsed.length > 0 && <div className="text-xs text-gray-400 mt-1">Models: {currentStats.modelsUsed.join(', ')}</div>}
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">{currentStats.deviceType === 'desktop' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}{currentStats.deviceType}</div>
                    </div>
                    <button onClick={resumeConversation} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto">
                      <RotateCcw className="w-4 h-4" /> Resume with fresh agents
                    </button>
                  </div>
                )}
              </>
            )}
            
            {currentThinking && (
              <div className="flex justify-start">
                <div className={`rounded-2xl px-4 py-3 text-sm ${currentThinking.agent === 'claude' ? 'bg-orange-50/50' : 'bg-blue-50/50'}`}>
                  <span className={`${currentThinking.agent === 'claude' ? 'text-orange-400' : 'text-blue-400'} animate-pulse`}>{currentThinking.agent === 'claude' ? 'Claude' : 'Gemini'} thinking...</span>
                  <span className="text-gray-400 italic ml-2">"{currentThinking.text}"</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 flex gap-2 flex-wrap">
              {attachments.map(att => (
                <div key={att.id} className="relative group">
                  {att.type === 'image' ? <img src={att.url} alt={att.name} className="w-20 h-20 object-cover rounded-lg" /> : <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center"><FileText className="w-8 h-8 text-gray-400" /></div>}
                  <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
            {isConversationEnded ? (
              <div className="text-center text-sm text-gray-400 py-2">
                Conversation ended. <button onClick={resumeConversation} className="text-blue-500 hover:underline">Resume</button> or <button onClick={() => startNewConversation()} className="text-blue-500 hover:underline">start new</button>
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*,.pdf,.txt,.md" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Paperclip className="w-5 h-5" /></button>
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[44px] max-h-[120px]" rows={1} disabled={isProcessing}
                  onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }} />
                {messages.length > 0 && !isProcessing && (
                  <button type="button" onClick={endConversation} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="End conversation">
                    <PhoneOff className="w-5 h-5" />
                  </button>
                )}
                {isProcessing ? (
                  <button type="button" onClick={handleHush} className="p-2.5 bg-red-500 text-white rounded-lg"><Square className="w-5 h-5" /></button>
                ) : (
                  <button type="submit" disabled={!input.trim() && attachments.length === 0} className="p-2.5 bg-blue-500 text-white rounded-lg disabled:opacity-40"><Send className="w-5 h-5" /></button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Controls */}
        <div className="w-56 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Agent Priority</div>
            <AgentPrioritySelector value={agentPriority} onChange={setAgentPriority} />
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {Object.entries(agents).map(([id, agent]) => {
              const color = id === 'claude' ? 'orange' : 'blue' as const
              const energy = getEnergy(agent.tokensIn, agent.tokensOut, id as 'claude' | 'gemini')
              return (
                <div key={id} className={`p-3 rounded-xl border ${activeAgent === id ? id === 'claude' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {id === 'claude' ? <ClaudeLogo className="w-5 h-5" /> : <GeminiLogo className="w-5 h-5" />}
                      <span className={`font-medium text-sm ${id === 'claude' ? 'text-orange-700' : 'text-blue-700'}`}>{agent.name}</span>
                    </div>
                    <button onClick={() => handlePoke(id)} disabled={isProcessing || isConversationEnded} className="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Poke</button>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Energy</span><span>{energy.toFixed(0)}%</span></div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full transition-all ${energy > 50 ? 'bg-green-500' : energy > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${energy}%` }} /></div>
                    <div className="text-xs text-gray-400 mt-1">{(agent.tokensIn + agent.tokensOut).toLocaleString()} tokens</div>
                  </div>
                  <div className="space-y-3">
                    <div><div className="text-xs text-gray-500 mb-1">Speed</div><ThreePointSlider value={agent.settings.speed} onChange={(v) => updateAgentSetting(id, 'speed', v)} labels={['Deep', 'Medium', 'Fast']} color={color} /></div>
                    <div><div className="text-xs text-gray-500 mb-1">Verbosity</div><ThreePointSlider value={agent.settings.verbosity} onChange={(v) => updateAgentSetting(id, 'verbosity', v)} labels={['Brief', 'Medium', 'Full']} color={color} /></div>
                    <div><div className="text-xs text-gray-500 mb-1">Tension</div><ThreePointSlider value={agent.settings.tension} onChange={(v) => updateAgentSetting(id, 'tension', v)} labels={['Chill', 'Medium', 'Spicy']} color={color} /></div>
                    <div><div className="text-xs text-gray-500 mb-1">Creativity</div><ThreePointSlider value={agent.settings.creativity} onChange={(v) => updateAgentSetting(id, 'creativity', v)} labels={['Safe', 'Balanced', 'Wild']} color={color} /></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scribe */}
          <div className="border-t border-gray-100 p-3">
            <button onClick={() => setShowScribe(!showScribe)} className="w-full flex items-center justify-between text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5"><FlashLogo className="w-4 h-4" />Scribe for agents</span>
              <span className="flex items-center gap-1"><span className="text-gray-400">({scribeNotes.length})</span>{showScribe ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</span>
            </button>
            <div className="text-xs text-gray-400 mt-0.5">Model: {SCRIBE_MODEL}</div>
            
            {showScribe && scribeNotes.length > 0 && (
              <>
                <div className="flex gap-2 mt-2 mb-2">
                  <button onClick={() => { navigator.clipboard.writeText(scribeNotes.map(n => n.content).join('\n\n')); setScribeCopied(true); setTimeout(() => setScribeCopied(false), 2000) }} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-gray-100 hover:bg-gray-200 rounded">
                    {scribeCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}{scribeCopied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={() => startNewConversation(scribeNotes.map(n => n.content).join('\n\n'))} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded">
                    <RotateCcw className="w-3 h-3" />New
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {scribeNotes.map((note, i) => (
                    <div key={i} className="text-xs text-gray-600 bg-yellow-50 rounded-lg p-2.5 leading-relaxed">
                      <div className="text-xs text-yellow-600 mb-1">{formatTime(note.timestamp)}</div>
                      <FormattedText content={note.content} />
                    </div>
                  ))}
                </div>
              </>
            )}
            {showScribe && scribeNotes.length === 0 && <div className="mt-2 text-xs text-gray-400 italic">Notes appear after ~4 exchanges...</div>}
          </div>
        </div>
      </div>
    </main>
  )
}
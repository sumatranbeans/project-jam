'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  MessageSquare, LogOut, Settings, Send, Square, MessageCircle,
  Copy, ThumbsUp, ThumbsDown, Plus, Clock, FileText, ChevronDown, ChevronUp
} from 'lucide-react'

// Types
interface Message {
  id: string
  role: 'user' | 'claude' | 'gemini'
  content: string
  thinking?: string
  tokensIn?: number
  tokensOut?: number
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
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
}

const defaultSettings: AgentSettings = {
  verbosity: 2,
  creativity: 2,
  tension: 2,
  speed: 2
}

// Claude Logo
function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} fill="currentColor">
      <path d="M128 0C57.308 0 0 57.308 0 128s57.308 128 128 128 128-57.308 128-128S198.692 0 128 0zm-8.485 184.485L75.029 140H60v-24h15.029l44.486-44.485L132 84v88l-12.485 12.485zM196 140h-40v-24h40v24z"/>
    </svg>
  )
}

// Gemini Logo  
function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 3.6c2.2 0 4.2.9 5.7 2.3l-2.1 2.1c-1-.8-2.2-1.2-3.6-1.2-3.1 0-5.6 2.5-5.6 5.6s2.5 5.6 5.6 5.6c2.5 0 4.6-1.6 5.3-3.9h-5.3v-3h8.7c.1.5.1 1 .1 1.5 0 4.7-3.2 8.7-8.8 8.7-5.1 0-9.3-4.2-9.3-9.3S6.9 3.6 12 3.6z"/>
    </svg>
  )
}

// Flash Logo
function FlashLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )
}

// 3-option toggle
function TripleToggle({ 
  value, 
  onChange, 
  labels,
  color = 'gray'
}: { 
  value: number
  onChange: (v: number) => void
  labels: [string, string, string]
  color?: 'orange' | 'blue' | 'gray'
}) {
  const colors = {
    orange: 'bg-orange-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-600'
  }
  
  return (
    <div className="flex bg-gray-100 rounded p-0.5 text-[10px]">
      {[1, 2, 3].map((v, i) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-1.5 py-0.5 rounded transition-all ${
            value === v ? `${colors[color]} text-white` : 'text-gray-500 hover:bg-gray-200'
          }`}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  )
}

// Agent bias slider
function BiasSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <ClaudeLogo className="w-3 h-3 text-orange-500" />
      <input
        type="range"
        min="-1"
        max="1"
        step="1"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <GeminiLogo className="w-3 h-3 text-blue-500" />
    </div>
  )
}

// Format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function LoungePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  
  // UI State
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentThinking, setCurrentThinking] = useState<{ agent: string; text: string } | null>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [showScribeNotes, setShowScribeNotes] = useState(false)
  const [scribeNotes, setScribeNotes] = useState('')
  const [agentBias, setAgentBias] = useState(0) // -1 Claude, 0 Neutral, 1 Gemini
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    claude: { name: 'Claude', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0 },
    gemini: { name: 'Gemini', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0 }
  })

  // Calculate energy based on context window
  const getEnergy = (tokensIn: number, tokensOut: number, model: 'claude' | 'gemini') => {
    const contextWindow = model === 'claude' ? 200000 : 1000000
    const used = tokensIn + tokensOut
    return Math.max(0, 100 - (used / contextWindow) * 100)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentThinking])

  // Load conversations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lounge-conversations')
    if (saved) {
      const parsed = JSON.parse(saved)
      setConversations(parsed.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      })))
    }
  }, [])

  // Save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('lounge-conversations', JSON.stringify(conversations))
    }
  }, [conversations])

  const updateAgentSetting = (agentId: string, key: keyof AgentSettings, value: number) => {
    setAgents(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], settings: { ...prev[agentId].settings, [key]: value } }
    }))
  }

  const addMessage = useCallback((role: Message['role'], content: string, thinking?: string, tokensIn?: number, tokensOut?: number) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      thinking,
      tokensIn,
      tokensOut,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, msg])
    
    // Update conversation
    if (activeConversationId) {
      setConversations(prev => prev.map(c => 
        c.id === activeConversationId ? { ...c, messages: [...c.messages, msg] } : c
      ))
    }
    
    return msg
  }, [activeConversationId])

  const startNewConversation = () => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      title: 'New conversation',
      messages: [],
      createdAt: new Date()
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setMessages([])
    setAgents({
      claude: { name: 'Claude', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0 },
      gemini: { name: 'Gemini', settings: { ...defaultSettings }, tokensIn: 0, tokensOut: 0 }
    })
    setScribeNotes('')
  }

  const loadConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id)
    setMessages(conv.messages)
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const totalTokensIn = agents.claude.tokensIn + agents.gemini.tokensIn
  const totalTokensOut = agents.claude.tokensOut + agents.gemini.tokensOut

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return
    
    // Start new conversation if none active
    if (!activeConversationId) {
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        title: input.trim().slice(0, 30) + (input.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date()
      }
      setConversations(prev => [newConv, ...prev])
      setActiveConversationId(newConv.id)
    }
    
    await sendMessage(input.trim())
  }

  const handlePoke = async (agentId: string) => {
    if (isProcessing) return
    await sendMessage(`@${agentId} Please share more thoughts.`, true)
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
      const response = await fetch('/api/lounge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageText }],
          agents: { claude: agents.claude.settings, gemini: agents.gemini.settings },
          bias: agentBias
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok || !response.body) throw new Error('Failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6))
            
            if (data.type === 'thinking') {
              setActiveAgent(data.agent)
              setCurrentThinking({ agent: data.agent, text: data.content })
            } else if (data.type === 'complete') {
              setCurrentThinking(null)
              addMessage(data.agent, data.content, data.thinking, data.tokens?.in, data.tokens?.out)
              setAgents(prev => ({
                ...prev,
                [data.agent]: {
                  ...prev[data.agent],
                  tokensIn: prev[data.agent].tokensIn + (data.tokens?.in || 0),
                  tokensOut: prev[data.agent].tokensOut + (data.tokens?.out || 0)
                }
              }))
              setActiveAgent(null)
            } else if (data.type === 'scribe') {
              setScribeNotes(data.content)
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

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>
  }

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Project Lounge</h1>
            <p className="text-[10px] text-gray-500">Multi-agent conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
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
        {/* Left Sidebar - History */}
        <div className="w-56 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-2">
            <button
              onClick={startNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <Plus className="w-3 h-3" />
              New conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={`w-full text-left px-3 py-2 text-xs border-b border-gray-100 hover:bg-gray-50 ${
                  activeConversationId === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="font-medium text-gray-700 truncate">{conv.title}</div>
                <div className="text-[10px] text-gray-400">{conv.createdAt.toLocaleDateString()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm">Start a conversation</p>
                <p className="text-xs">Ask a question and watch the agents discuss</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-gray-800 text-white'
                      : msg.role === 'claude'
                      ? 'bg-orange-50 border border-orange-100'
                      : 'bg-blue-50 border border-blue-100'
                  }`}>
                    {msg.role !== 'user' && (
                      <div className={`text-[10px] font-medium mb-1 flex items-center gap-1 ${
                        msg.role === 'claude' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        {msg.role === 'claude' ? <ClaudeLogo className="w-3 h-3" /> : <GeminiLogo className="w-3 h-3" />}
                        {msg.role === 'claude' ? 'Claude' : 'Gemini'}
                        <span className="text-gray-400 font-normal ml-1">
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</div>
                    
                    {/* Message actions */}
                    {msg.role !== 'user' && (
                      <div className="flex items-center gap-1 mt-2 pt-1 border-t border-gray-100">
                        <button onClick={() => copyMessage(msg.content)} className="p-1 hover:bg-white/50 rounded text-gray-400 hover:text-gray-600">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button className="p-1 hover:bg-white/50 rounded text-gray-400 hover:text-green-600">
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button className="p-1 hover:bg-white/50 rounded text-gray-400 hover:text-red-600">
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                        {(msg.tokensIn || msg.tokensOut) && (
                          <span className="text-[9px] text-gray-400 ml-auto">
                            {((msg.tokensIn || 0) + (msg.tokensOut || 0)).toLocaleString()} tokens
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Thinking Peek */}
            {currentThinking && (
              <div className="flex justify-start">
                <div className={`rounded-xl px-3 py-2 animate-pulse text-xs ${
                  currentThinking.agent === 'claude' ? 'bg-orange-50/60' : 'bg-blue-50/60'
                }`}>
                  <span className={currentThinking.agent === 'claude' ? 'text-orange-400' : 'text-blue-400'}>
                    {currentThinking.agent === 'claude' ? 'Claude' : 'Gemini'} thinking...
                  </span>
                  <span className="text-gray-400 italic ml-2">💭 "{currentThinking.text}"</span>
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
                placeholder="Ask something..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
              {isProcessing ? (
                <button type="button" onClick={handleHush} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 text-sm">
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Sidebar - Scribe Notes (top) + Controls (bottom) */}
        <div className="w-64 border-l border-gray-200 bg-white flex flex-col">
          {/* Scribe Notes - Top Half */}
          <div className="flex-1 border-b border-gray-200 p-3 overflow-y-auto">
            <button 
              onClick={() => setShowScribeNotes(!showScribeNotes)}
              className="w-full flex items-center justify-between text-xs font-medium text-gray-600 mb-2"
            >
              <span className="flex items-center gap-1.5">
                <FlashLogo className="w-3.5 h-3.5 text-yellow-500" />
                Scribe Notes
              </span>
              {showScribeNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showScribeNotes && (
              <div className="text-[10px] text-gray-500 bg-gray-50 rounded p-2">
                {scribeNotes || 'No notes yet. The scribe will summarize key points as the conversation progresses.'}
              </div>
            )}
          </div>

          {/* Agent Controls - Bottom Half */}
          <div className="flex-1 p-3 overflow-y-auto">
            {/* Agent Bias */}
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 mb-1">Agent Priority</div>
              <BiasSlider value={agentBias} onChange={setAgentBias} />
            </div>

            {/* Agent Cards */}
            {Object.entries(agents).map(([id, agent]) => {
              const color = id === 'claude' ? 'orange' : 'blue'
              const energy = getEnergy(agent.tokensIn, agent.tokensOut, id as 'claude' | 'gemini')
              
              return (
                <div key={id} className={`mb-3 p-2 rounded-lg border ${
                  activeAgent === id 
                    ? id === 'claude' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {id === 'claude' ? <ClaudeLogo className="w-4 h-4 text-orange-500" /> : <GeminiLogo className="w-4 h-4 text-blue-500" />}
                      <span className={`text-xs font-medium ${id === 'claude' ? 'text-orange-600' : 'text-blue-600'}`}>
                        {agent.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handlePoke(id)}
                      disabled={isProcessing}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    >
                      Poke
                    </button>
                  </div>

                  {/* Energy */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[9px] text-gray-500 mb-0.5">
                      <span>Energy</span>
                      <span>{energy.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${energy > 50 ? 'bg-green-500' : energy > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${energy}%` }}
                      />
                    </div>
                    <div className="text-[8px] text-gray-400 mt-0.5">
                      {(agent.tokensIn + agent.tokensOut).toLocaleString()} tokens ({agent.tokensIn.toLocaleString()} in / {agent.tokensOut.toLocaleString()} out)
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-500">Verbosity</span>
                      <TripleToggle value={agent.settings.verbosity} onChange={(v) => updateAgentSetting(id, 'verbosity', v)} labels={['Brief', 'Med', 'Full']} color={color} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-500">Creativity</span>
                      <TripleToggle value={agent.settings.creativity} onChange={(v) => updateAgentSetting(id, 'creativity', v)} labels={['Fact', 'Bal', 'Wild']} color={color} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-500">Tension</span>
                      <TripleToggle value={agent.settings.tension} onChange={(v) => updateAgentSetting(id, 'tension', v)} labels={['Chill', 'Med', 'Spicy']} color={color} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-500">Speed</span>
                      <TripleToggle value={agent.settings.speed} onChange={(v) => updateAgentSetting(id, 'speed', v)} labels={['Deep', 'Med', 'Fast']} color={color} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
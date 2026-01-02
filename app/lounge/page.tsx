'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageSquare, LogOut, Settings, Send, Square, MessageCircle } from 'lucide-react'

// Types
interface Message {
  id: string
  role: 'user' | 'claude' | 'gemini'
  content: string
  thinking?: string
  tokens?: { in: number; out: number }
  timestamp: Date
}

interface AgentSettings {
  verbosity: number    // 1, 2, 3 (Low, Medium, High)
  creativity: number   // 0.25, 0.5, 0.75
  tension: number      // 1, 2, 3
  speed: number        // 1, 2, 3
}

interface AgentState {
  name: string
  settings: AgentSettings
  tokensIn: number
  tokensOut: number
  energy: number
}

const defaultSettings: AgentSettings = {
  verbosity: 2,
  creativity: 0.5,
  tension: 2,
  speed: 2
}

// Simple 3-option selector component
function TripleToggle({ 
  value, 
  onChange, 
  labels = ['Low', 'Med', 'High'],
  color = 'blue'
}: { 
  value: number
  onChange: (v: number) => void
  labels?: [string, string, string]
  color?: 'orange' | 'blue'
}) {
  const colorClasses = {
    orange: 'bg-orange-500',
    blue: 'bg-blue-500'
  }
  
  return (
    <div className="flex bg-gray-200 rounded-lg p-0.5">
      {[1, 2, 3].map((v, i) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2 py-1 text-xs rounded-md transition-all ${
            value === v 
              ? `${colorClasses[color]} text-white` 
              : 'text-gray-600 hover:bg-gray-300'
          }`}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  )
}

export default function LoungePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentThinking, setCurrentThinking] = useState<{ agent: string; text: string } | null>(null)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [agents, setAgents] = useState<Record<string, AgentState>>({
    claude: {
      name: 'Claude',
      settings: { ...defaultSettings },
      tokensIn: 0,
      tokensOut: 0,
      energy: 100
    },
    gemini: {
      name: 'Gemini',
      settings: { ...defaultSettings, tension: 2 },
      tokensIn: 0,
      tokensOut: 0,
      energy: 100
    }
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentThinking])

  const updateAgentSetting = (agentId: string, key: keyof AgentSettings, value: number) => {
    setAgents(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        settings: { ...prev[agentId].settings, [key]: value }
      }
    }))
  }

  const updateAgentTokens = (agentId: string, tokensIn: number, tokensOut: number) => {
    setAgents(prev => {
      const agent = prev[agentId]
      const newTotalTokens = agent.tokensIn + agent.tokensOut + tokensIn + tokensOut
      const maxTokens = 100000
      const newEnergy = Math.max(0, 100 - (newTotalTokens / maxTokens) * 100)
      
      return {
        ...prev,
        [agentId]: {
          ...agent,
          tokensIn: agent.tokensIn + tokensIn,
          tokensOut: agent.tokensOut + tokensOut,
          energy: newEnergy
        }
      }
    })
  }

  const addMessage = useCallback((role: Message['role'], content: string, thinking?: string, tokens?: { in: number; out: number }) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      thinking,
      tokens,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, msg])
    return msg
  }, [])

  const totalTokens = agents.claude.tokensIn + agents.claude.tokensOut + agents.gemini.tokensIn + agents.gemini.tokensOut

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return
    await sendMessage(input.trim())
  }

  const handlePoke = async (agentId: string) => {
    if (isProcessing) return
    await sendMessage(`@${agentId} Please share your thoughts on the current discussion.`, true)
  }

  const handleHush = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsProcessing(false)
    setCurrentThinking(null)
    setActiveAgent(null)
  }

  const sendMessage = async (messageText: string, isPoke = false) => {
    setInput('')
    setIsProcessing(true)
    
    if (!isPoke) {
      addMessage('user', messageText)
    }

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/lounge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageText }],
          agents: {
            claude: agents.claude.settings,
            gemini: agents.gemini.settings
          }
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) throw new Error('Failed to get response')
      if (!response.body) throw new Error('No response body')

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
              
              if (data.agent === 'claude') {
                addMessage('claude', data.content, data.thinking, data.tokens)
                updateAgentTokens('claude', data.tokens?.in || 0, data.tokens?.out || 0)
              } else if (data.agent === 'gemini') {
                addMessage('gemini', data.content, data.thinking, data.tokens)
                updateAgentTokens('gemini', data.tokens?.in || 0, data.tokens?.out || 0)
              }
              setActiveAgent(null)
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Chat error:', error)
        addMessage('claude', 'Sorry, something went wrong. Please try again.')
      }
    } finally {
      setIsProcessing(false)
      setCurrentThinking(null)
      setActiveAgent(null)
      abortControllerRef.current = null
    }
  }

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>
  }

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Project Lounge</h1>
            <p className="text-xs text-gray-500">Multi-agent conversation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
            <button onClick={() => router.push('/settings')} className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-4 h-4" />
            </button>
            <SignOutButton>
              <button className="p-2 hover:bg-gray-100 rounded-lg"><LogOut className="w-4 h-4" /></button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">Start a conversation</p>
                <p className="text-sm">Ask a question and watch the agents discuss</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gray-800 text-white'
                      : msg.role === 'claude'
                      ? 'bg-orange-50 text-gray-900 border border-orange-200'
                      : 'bg-blue-50 text-gray-900 border border-blue-200'
                  }`}>
                    {msg.role !== 'user' && (
                      <div className={`text-xs font-medium mb-1 flex items-center gap-2 ${
                        msg.role === 'claude' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        <span className="flex items-center gap-1.5">
                          {msg.role === 'claude' ? (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          )}
                          {msg.role === 'claude' ? 'Claude' : 'Gemini'}
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            
            {/* Thinking Peek */}
            {currentThinking && (
              <div className="flex justify-start">
                <div className={`max-w-[60%] rounded-2xl px-4 py-2 animate-pulse ${
                  currentThinking.agent === 'claude' 
                    ? 'bg-orange-50/60 border border-orange-100' 
                    : 'bg-blue-50/60 border border-blue-100'
                }`}>
                  <div className={`text-xs font-medium mb-1 ${
                    currentThinking.agent === 'claude' ? 'text-orange-400' : 'text-blue-400'
                  }`}>
                    {currentThinking.agent === 'claude' ? 'Claude' : 'Gemini'} thinking...
                  </div>
                  <div className="text-gray-500 italic text-sm">
                    💭 "{currentThinking.text}"
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something and watch the agents discuss..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
              {isProcessing ? (
                <button
                  type="button"
                  onClick={handleHush}
                  className="px-5 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Agent Controls Sidebar - Simplified */}
        <div className="w-72 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            {Object.entries(agents).map(([id, agent]) => {
              const color = id === 'claude' ? 'orange' : 'blue'
              const bgColor = id === 'claude' ? 'bg-orange-50' : 'bg-blue-50'
              const borderColor = id === 'claude' ? 'border-orange-200' : 'border-blue-200'
              const textColor = id === 'claude' ? 'text-orange-600' : 'text-blue-600'
              const totalAgentTokens = agent.tokensIn + agent.tokensOut
              
              return (
                <div key={id} className={`mb-4 p-3 rounded-xl border ${
                  activeAgent === id ? `${bgColor} ${borderColor}` : 'bg-gray-50 border-gray-100'
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {id === 'claude' ? (
                        <svg viewBox="0 0 24 24" className={`w-5 h-5 ${textColor}`} fill="currentColor">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className={`w-5 h-5 ${textColor}`} fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      )}
                      <span className={`font-semibold ${textColor}`}>{agent.name}</span>
                    </div>
                    <button
                      onClick={() => handlePoke(id)}
                      disabled={isProcessing}
                      className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50 ${
                        id === 'claude' 
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' 
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                    >
                      <MessageCircle className="w-3 h-3" />
                      Poke
                    </button>
                  </div>

                  {/* Energy Bar with Tokens underneath */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Energy</span>
                      <span>{agent.energy.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          agent.energy > 50 ? 'bg-green-500' : agent.energy > 20 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${agent.energy}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-right">
                      {totalAgentTokens.toLocaleString()} tokens used
                    </div>
                  </div>

                  {/* Controls Grid - Compact */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Verbosity</span>
                      <TripleToggle 
                        value={agent.settings.verbosity} 
                        onChange={(v) => updateAgentSetting(id, 'verbosity', v)}
                        labels={['Brief', 'Med', 'Full']}
                        color={color}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Creativity</span>
                      <TripleToggle 
                        value={agent.settings.creativity === 0.25 ? 1 : agent.settings.creativity === 0.5 ? 2 : 3} 
                        onChange={(v) => updateAgentSetting(id, 'creativity', v === 1 ? 0.25 : v === 2 ? 0.5 : 0.75)}
                        labels={['Safe', 'Med', 'Wild']}
                        color={color}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Tension</span>
                      <TripleToggle 
                        value={agent.settings.tension} 
                        onChange={(v) => updateAgentSetting(id, 'tension', v)}
                        labels={['Chill', 'Med', 'Spicy']}
                        color={color}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Speed</span>
                      <TripleToggle 
                        value={agent.settings.speed} 
                        onChange={(v) => updateAgentSetting(id, 'speed', v)}
                        labels={['Deep', 'Med', 'Fast']}
                        color={color}
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Total Tokens */}
            <div className="mt-2 p-3 rounded-xl bg-gray-100 text-center">
              <div className="text-xs text-gray-500">Total Tokens</div>
              <div className="text-lg font-semibold text-gray-700">{totalTokens.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
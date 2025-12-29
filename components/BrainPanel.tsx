'use client'

import { Brain, User } from 'lucide-react'

export type Message = {
  id: string
  role: 'user' | 'claude' | 'gemini' | 'system'
  content: string
  timestamp: Date
  thinking?: string
  approved?: boolean
}

type BrainPanelProps = {
  messages: Message[]
  status: string
}

const ClaudeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M128 0C57.308 0 0 57.308 0 128s57.308 128 128 128 128-57.308 128-128S198.692 0 128 0z" fill="#D4A574"/>
    <path d="M128 32c-52.935 0-96 43.065-96 96s43.065 96 96 96 96-43.065 96-96-43.065-96-96-96zm0 160c-35.29 0-64-28.71-64-64s28.71-64 64-64 64 28.71 64 64-28.71 64-64 64z" fill="#C4956A"/>
  </svg>
)

const GeminiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4"/>
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4285F4" strokeWidth="2" fill="none"/>
  </svg>
)

export function BrainPanel({ messages, status }: BrainPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500" />
          <span className="font-semibold text-gray-900">Workspace</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-full border border-amber-200">
            <ClaudeIcon />
            <span className="text-amber-800 font-medium">Engineering Lead</span>
            <span className="text-amber-600 opacity-75">Claude Opus 4.5</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-full border border-blue-200">
            <GeminiIcon />
            <span className="text-blue-800 font-medium">Product Architect</span>
            <span className="text-blue-600 opacity-75">Gemini 3 Pro</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-500">{status}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Brain className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Start a conversation to see the agents work</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isClaude = message.role === 'claude'
  const isGemini = message.role === 'gemini'

  const alignment = isUser ? 'justify-center' : isClaude ? 'justify-start' : 'justify-end'
  const bgColor = isUser 
    ? 'bg-gray-100 text-gray-900' 
    : isClaude 
    ? 'bg-amber-50 text-amber-900 border border-amber-200' 
    : 'bg-blue-50 text-blue-900 border border-blue-200'
  
  const icon = isUser 
    ? <User className="w-4 h-4" /> 
    : isClaude 
    ? <ClaudeIcon /> 
    : <GeminiIcon />

  const label = isUser ? 'You' : isClaude ? 'Engineering Lead' : 'Product Architect'
  const modelName = isClaude ? 'Claude Opus 4.5' : isGemini ? 'Gemini 3 Pro' : ''
  const maxWidth = isUser ? 'max-w-full' : 'max-w-[85%]'
  
  const timestamp = message.timestamp.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })

  return (
    <div className={`flex ${alignment}`}>
      <div className={`${maxWidth} ${bgColor} rounded-2xl px-4 py-3`}>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs font-medium opacity-70">{label}</span>
          {modelName && <span className="text-xs opacity-50">({modelName})</span>}
          <span className="text-xs opacity-40">{timestamp}</span>
          {message.approved !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${message.approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.approved ? 'Approved' : 'Vetoed'}
            </span>
          )}
        </div>
        {message.thinking && (
          <p className="text-xs italic opacity-60 mb-2">{message.thinking}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
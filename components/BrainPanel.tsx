'use client'

import { Brain, User, Bot, Shield } from 'lucide-react'

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
          <div className="flex items-center gap-1 text-amber-600">
            <Bot className="w-3 h-3" />
            <span>Builder (Claude)</span>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <Shield className="w-3 h-3" />
            <span>Supervisor (Gemini)</span>
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
    ? <Bot className="w-4 h-4 text-amber-500" /> 
    : <Shield className="w-4 h-4 text-blue-500" />

  const label = isUser ? 'You' : isClaude ? 'Builder' : 'Supervisor'
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
          <span className="text-xs opacity-50">{timestamp}</span>
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
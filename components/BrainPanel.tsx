'use client'

import { Bot, Sparkles, User } from 'lucide-react'

export type Message = {
  id: string
  role: 'user' | 'claude' | 'gemini' | 'system'
  content: string
  timestamp: Date
}

type BrainPanelProps = {
  messages: Message[]
  status: string
}

export function BrainPanel({ messages, status }: BrainPanelProps) {
  const getRoleIcon = (role: Message['role']) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'claude':
        return <Bot className="w-4 h-4 text-jam-claude" />
      case 'gemini':
        return <Sparkles className="w-4 h-4 text-jam-gemini" />
      default:
        return null
    }
  }

  const getRoleLabel = (role: Message['role']) => {
    switch (role) {
      case 'user':
        return 'You'
      case 'claude':
        return 'Claude (Student)'
      case 'gemini':
        return 'Gemini (Teacher)'
      case 'system':
        return 'System'
    }
  }

  const getRoleColor = (role: Message['role']) => {
    switch (role) {
      case 'claude':
        return 'border-jam-claude/30 bg-amber-50'
      case 'gemini':
        return 'border-jam-gemini/30 bg-blue-50'
      case 'user':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-jam-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-jam-success animate-pulse" />
          <span className="text-sm font-medium text-gray-700">The Brain</span>
        </div>
        <span className="text-xs text-gray-500">{status}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Bot className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Start a conversation to see the agent dialogue</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg border p-3 ${getRoleColor(message.role)}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getRoleIcon(message.role)}
                <span className="text-xs font-medium text-gray-600">
                  {getRoleLabel(message.role)}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
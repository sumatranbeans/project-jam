'use client'

import { Brain, User, Wrench } from 'lucide-react'

export type Message = {
  id: string
  role: 'user' | 'claude' | 'gemini' | 'system' | 'reflex'
  content: string
  timestamp: Date
  thinking?: string
  approved?: boolean
  attemptNumber?: number
}

type BrainPanelProps = {
  messages: Message[]
  status: string
}

// Official Claude icon (Bootstrap Icons)
const ClaudeIcon = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="#D97706" viewBox="0 0 16 16">
    <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
  </svg>
)

// Google Gemini sparkle icon (official 4-point star with gradient)
const GeminiIcon = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24">
    <defs>
      <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1A73E8"/>
        <stop offset="50%" stopColor="#8E63CF"/>
        <stop offset="100%" stopColor="#D93025"/>
      </linearGradient>
    </defs>
    <path fill="url(#geminiGrad)" d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"/>
  </svg>
)

export function BrainPanel({ messages, status }: BrainPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header row - matches OutputPanel height */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-gray-200">
        <Brain className="w-4 h-4 text-amber-500" />
        <span className="font-medium text-sm text-gray-900">Workspace</span>
        
        {/* Role badges */}
        <div className="flex items-center gap-2 ml-4">
          {/* You (Director) */}
          <div className="flex items-center gap-1.5 h-7 px-2.5 bg-gray-100 rounded-full border border-gray-200">
            <User className="w-3 h-3 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">You</span>
            <span className="text-[10px] text-gray-400">Director</span>
          </div>
          
          {/* Product Architect (Gemini) */}
          <div className="flex items-center gap-1.5 h-7 px-2.5 bg-blue-50 rounded-full border border-blue-200">
            <GeminiIcon size={12} />
            <span className="text-xs font-medium text-blue-800">Product Architect</span>
            <span className="text-[10px] text-blue-500">Gemini 3 Pro</span>
          </div>
          
          {/* Engineering Lead (Claude) */}
          <div className="flex items-center gap-1.5 h-7 px-2.5 bg-amber-50 rounded-full border border-amber-200">
            <ClaudeIcon size={12} />
            <span className="text-xs font-medium text-amber-800">Engineering Lead</span>
            <span className="text-[10px] text-amber-500">Claude Opus 4.5</span>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="text-[11px] text-gray-500">{status}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Brain className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-xs">Start a conversation to see the agents work</p>
          </div>
        ) : (
          messages.map((message) => (
            message.role === 'reflex' 
              ? <ReflexIndicator key={message.id} message={message} />
              : <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>
    </div>
  )
}

// Reflex State Indicator - non-chat bubble, shows self-correction in progress
function ReflexIndicator({ message }: { message: Message }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center justify-center w-5 h-5 bg-amber-100 rounded-full animate-pulse">
          <Wrench className="w-3 h-3 text-amber-600" />
        </div>
        <div className="flex items-center gap-2">
          <ClaudeIcon size={12} />
          <span className="text-xs font-medium text-amber-800">
            🔧 {message.content}
          </span>
          {message.attemptNumber && (
            <span className="text-[10px] text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded-full">
              Attempt {message.attemptNumber}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isClaude = message.role === 'claude'
  const isGemini = message.role === 'gemini'
  const isSystem = message.role === 'system'

  const alignment = isUser ? 'justify-center' : isClaude ? 'justify-start' : 'justify-end'
  
  const bgColor = isUser 
    ? 'bg-gray-100 text-gray-900' 
    : isClaude 
    ? 'bg-amber-50 text-amber-900 border border-amber-100' 
    : isSystem
    ? 'bg-green-50 text-green-900 border border-green-200'
    : 'bg-blue-50 text-blue-900 border border-blue-100'

  const label = isUser ? 'You' : isClaude ? 'Engineering Lead' : isSystem ? 'System' : 'Product Architect'
  const modelName = isClaude ? 'Claude Opus 4.5' : isGemini ? 'Gemini 3 Pro' : isSystem ? '' : 'Director'
  const maxWidth = isUser ? 'max-w-full' : 'max-w-[80%]'
  
  const timestamp = message.timestamp.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })

  return (
    <div className={`flex ${alignment}`}>
      <div className={`${maxWidth} ${bgColor} rounded-xl px-3 py-2`}>
        <div className="flex items-center gap-1.5 mb-1">
          {isUser && <User className="w-3 h-3 text-gray-600" />}
          {isClaude && <ClaudeIcon size={12} />}
          {isGemini && <GeminiIcon size={12} />}
          {isSystem && <Brain className="w-3 h-3 text-green-600" />}
          <span className="text-[11px] font-medium">{label}</span>
          {modelName && <span className="text-[9px] opacity-50">({modelName})</span>}
          <span className="text-[9px] opacity-30 ml-auto">{timestamp}</span>
          {message.approved !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-1 ${message.approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.approved ? '✓ Approved' : '✗ Vetoed'}
            </span>
          )}
        </div>
        {message.thinking && (
          <p className="text-[10px] italic opacity-50 mb-1">{message.thinking}</p>
        )}
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}
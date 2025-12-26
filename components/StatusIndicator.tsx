'use client'

import { Bot, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'

export type AgentStatus =
  | 'idle'
  | 'claude-coding'
  | 'gemini-auditing'
  | 'debate'
  | 'executing'
  | 'complete'
  | 'error'

type StatusIndicatorProps = {
  status: AgentStatus
  debateTurn?: number
  maxDebateTurns?: number
}

export function StatusIndicator({
  status,
  debateTurn,
  maxDebateTurns = 3,
}: StatusIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return {
          icon: null,
          text: 'Ready',
          color: 'text-zinc-500',
          bgColor: 'bg-zinc-800',
        }
      case 'claude-coding':
        return {
          icon: <Bot className="w-4 h-4 animate-pulse" />,
          text: 'Claude: Coding...',
          color: 'text-jam-claude',
          bgColor: 'bg-jam-claude/10',
        }
      case 'gemini-auditing':
        return {
          icon: <Sparkles className="w-4 h-4 animate-pulse" />,
          text: 'Gemini: Auditing...',
          color: 'text-jam-gemini',
          bgColor: 'bg-jam-gemini/10',
        }
      case 'debate':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: `Debate in Progress (${debateTurn}/${maxDebateTurns})`,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
        }
      case 'executing':
        return {
          icon: null,
          text: 'Executing in E2B...',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
        }
      case 'complete':
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          text: 'Complete',
          color: 'text-jam-success',
          bgColor: 'bg-jam-success/10',
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'Error',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
        }
    }
  }

  const { icon, text, color, bgColor } = getStatusDisplay()

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${color} ${bgColor}`}
    >
      {icon}
      <span>{text}</span>
    </div>
  )
}

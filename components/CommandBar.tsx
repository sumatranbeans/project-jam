'use client'

import { useState, KeyboardEvent } from 'react'
import { Send, Loader2 } from 'lucide-react'

type CommandBarProps = {
  onSubmit: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function CommandBar({
  onSubmit,
  disabled = false,
  placeholder = 'Describe what you want to build...',
}: CommandBarProps) {
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSubmit(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-jam-border bg-jam-surface p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-lg border border-jam-border bg-jam-bg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-jam-claude/50 focus:border-jam-claude/50 disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="flex items-center justify-center w-12 h-12 rounded-lg bg-jam-claude text-white hover:bg-jam-claude/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {disabled ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-zinc-600">
        <span>Enter to send</span>
        <span>•</span>
        <span>Shift+Enter for new line</span>
      </div>
    </div>
  )
}

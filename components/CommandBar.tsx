'use client'

import { useState } from 'react'
import { Send, Loader2, Square } from 'lucide-react'

type CommandBarProps = {
  onSubmit: (message: string) => void
  onCancel?: () => void
  disabled?: boolean
  placeholder?: string
  isProcessing?: boolean
}

export function CommandBar({ onSubmit, onCancel, disabled, placeholder, isProcessing }: CommandBarProps) {
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSubmit(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && isProcessing && onCancel) {
      onCancel()
    }
  }

  return (
    <div className="border-t border-jam-border bg-white px-6 py-4">
      <div className="flex items-center gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled && !isProcessing}
            placeholder={isProcessing ? 'Press Esc to cancel or type to append...' : (placeholder || 'Describe what you want to build...')}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
          />
        </div>
        {isProcessing ? (
          <button
            onClick={onCancel}
            className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 flex items-center justify-center min-w-[48px] gap-2"
            title="Cancel (Esc)"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Processing... Press Esc or click Stop to cancel</span>
        </div>
      )}
    </div>
  )
}
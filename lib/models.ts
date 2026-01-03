// Model Configuration - Update this file when new models are released
// Last updated: January 2026

export interface ModelConfig {
  id: string                    // API model identifier
  displayName: string           // Short name shown in UI
  fullName: string              // Full name for stats/details
  provider: 'anthropic' | 'google'
  tier: 'flagship' | 'fast' | 'lite'  // flagship=best, fast=balanced, lite=cheapest
  pricing: {
    input: number               // $ per 1M tokens
    output: number              // $ per 1M tokens
  }
  contextWindow: number         // Max tokens
  maxOutput: number             // Max output tokens
  capabilities: {
    thinking?: boolean          // Supports extended thinking
    vision?: boolean            // Supports image input
    tools?: boolean             // Supports function calling
  }
  apiConfig?: {
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'
    requiresThinkingSignature?: boolean
  }
  released: string              // Release date for reference
  deprecated?: boolean          // Mark when model is being phased out
}

// ============================================
// ANTHROPIC MODELS
// ============================================

export const CLAUDE_MODELS: ModelConfig[] = [
  {
    id: 'claude-opus-4-5-20251101',
    displayName: 'Opus 4.5',
    fullName: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'flagship',
    pricing: { input: 5.00, output: 25.00 },
    contextWindow: 200000,
    maxOutput: 32000,
    capabilities: { thinking: true, vision: true, tools: true },
    released: '2025-11-24'
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    displayName: 'Sonnet 4.5',
    fullName: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'fast',
    pricing: { input: 3.00, output: 15.00 },
    contextWindow: 200000,
    maxOutput: 64000,
    capabilities: { thinking: true, vision: true, tools: true },
    released: '2025-09-29'
  },
  {
    id: 'claude-sonnet-4-20250514',
    displayName: 'Sonnet 4',
    fullName: 'Claude Sonnet 4',
    provider: 'anthropic',
    tier: 'fast',
    pricing: { input: 3.00, output: 15.00 },
    contextWindow: 200000,
    maxOutput: 16000,
    capabilities: { thinking: false, vision: true, tools: true },
    released: '2025-05-14'
  },
  {
    id: 'claude-haiku-4-5-20251001',
    displayName: 'Haiku 4.5',
    fullName: 'Claude Haiku 4.5',
    provider: 'anthropic',
    tier: 'lite',
    pricing: { input: 0.80, output: 4.00 },
    contextWindow: 200000,
    maxOutput: 8192,
    capabilities: { thinking: false, vision: true, tools: true },
    released: '2025-10-01'
  }
]

// ============================================
// GOOGLE GEMINI MODELS
// ============================================

export const GEMINI_MODELS: ModelConfig[] = [
  {
    id: 'gemini-3-pro-preview',
    displayName: 'Pro 3',
    fullName: 'Gemini 3 Pro',
    provider: 'google',
    tier: 'flagship',
    pricing: { input: 1.25, output: 10.00 },
    contextWindow: 1000000,
    maxOutput: 65536,
    capabilities: { thinking: true, vision: true, tools: true },
    apiConfig: { thinkingLevel: 'minimal' },
    released: '2025-11-01'
  },
  {
    id: 'gemini-3-flash-preview',
    displayName: 'Flash 3',
    fullName: 'Gemini 3 Flash',
    provider: 'google',
    tier: 'fast',
    pricing: { input: 0.50, output: 3.00 },
    contextWindow: 1000000,
    maxOutput: 65536,
    capabilities: { thinking: true, vision: true, tools: true },
    apiConfig: { thinkingLevel: 'minimal', requiresThinkingSignature: true },
    released: '2025-12-01'
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Pro 2.5',
    fullName: 'Gemini 2.5 Pro',
    provider: 'google',
    tier: 'flagship',
    pricing: { input: 1.25, output: 5.00 },
    contextWindow: 1000000,
    maxOutput: 65536,
    capabilities: { thinking: true, vision: true, tools: true },
    released: '2025-03-25'
  },
  {
    id: 'gemini-2.5-flash',
    displayName: 'Flash 2.5',
    fullName: 'Gemini 2.5 Flash',
    provider: 'google',
    tier: 'fast',
    pricing: { input: 0.15, output: 0.60 },
    contextWindow: 1000000,
    maxOutput: 65536,
    capabilities: { thinking: true, vision: true, tools: true },
    released: '2025-05-01'
  }
]

// ============================================
// ACTIVE MODEL SELECTION
// ============================================

// These are the currently active models used in the app
// Change these to switch models without modifying other code

export const ACTIVE_MODELS = {
  claude: {
    flagship: 'claude-opus-4-5-20251101',      // Used when speed = 1 (Deep) or 2 (Medium)
    fast: 'claude-sonnet-4-20250514'           // Used when speed = 3 (Fast)
  },
  gemini: {
    flagship: 'gemini-3-pro-preview',          // Used when speed = 1 (Deep) or 2 (Medium)
    fast: 'gemini-3-flash-preview'             // Used when speed = 3 (Fast)
  },
  scribe: 'gemini-3-flash-preview'             // Model used for scribe summaries
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getModelById(id: string): ModelConfig | undefined {
  return [...CLAUDE_MODELS, ...GEMINI_MODELS].find(m => m.id === id)
}

export function getActiveClaudeModel(speed: number): ModelConfig {
  const modelId = speed === 3 ? ACTIVE_MODELS.claude.fast : ACTIVE_MODELS.claude.flagship
  return getModelById(modelId) || CLAUDE_MODELS[0]
}

export function getActiveGeminiModel(speed: number): ModelConfig {
  const modelId = speed === 3 ? ACTIVE_MODELS.gemini.fast : ACTIVE_MODELS.gemini.flagship
  return getModelById(modelId) || GEMINI_MODELS[0]
}

export function getScribeModel(): ModelConfig {
  return getModelById(ACTIVE_MODELS.scribe) || GEMINI_MODELS[1]
}

export function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModelById(modelId)
  if (!model) return 0
  return (inputTokens / 1_000_000 * model.pricing.input) + (outputTokens / 1_000_000 * model.pricing.output)
}

export function getAllModels(): ModelConfig[] {
  return [...CLAUDE_MODELS, ...GEMINI_MODELS].filter(m => !m.deprecated)
}

export function getModelsByProvider(provider: 'anthropic' | 'google'): ModelConfig[] {
  const models = provider === 'anthropic' ? CLAUDE_MODELS : GEMINI_MODELS
  return models.filter(m => !m.deprecated)
}

// For UI display - group by provider and tier
export function getModelOptions() {
  return {
    claude: {
      flagship: CLAUDE_MODELS.filter(m => m.tier === 'flagship' && !m.deprecated),
      fast: CLAUDE_MODELS.filter(m => m.tier === 'fast' && !m.deprecated),
      lite: CLAUDE_MODELS.filter(m => m.tier === 'lite' && !m.deprecated)
    },
    gemini: {
      flagship: GEMINI_MODELS.filter(m => m.tier === 'flagship' && !m.deprecated),
      fast: GEMINI_MODELS.filter(m => m.tier === 'fast' && !m.deprecated),
      lite: GEMINI_MODELS.filter(m => m.tier === 'lite' && !m.deprecated)
    }
  }
}
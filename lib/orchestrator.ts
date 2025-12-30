// lib/orchestrator.ts

import { callClaude, BUILDER_SYSTEM_PROMPT } from './claude'
import { callGemini, ARCHITECT_INTAKE_PROMPT, ARCHITECT_REVIEW_PROMPT } from './gemini'

// ============================================
// TYPES
// ============================================
export type Action = {
  type: 'createFile' | 'runCommand'
  path?: string
  content?: string
  command?: string
  port?: number
}

export type BuilderResponse = {
  actions: Action[]
  response: string
}

export type ArchitectReview = {
  approved: boolean
  reasoning: string
}

export type OrchestrationResult = {
  phase: 'clarification' | 'complete' | 'escalate'
  architectMessage?: string
  builderPlan?: BuilderResponse
  architectReview?: ArchitectReview
  approved: boolean
  finalActions: Action[]
  error?: string
  requiresDirectorInput?: boolean
  silentRetry?: boolean
  userFacingSummary?: string
  issuesResolved?: number
}

// ============================================
// ENVIRONMENT CONTEXT
// ============================================
function buildContext(sessionId: string, files: string[]): string {
  return `
## ENVIRONMENT
- Platform: CodeSandbox (cloud VM)
- Session: ${sessionId}
- Preview URL pattern: https://${sessionId}-{PORT}.csb.app
- Working directory: /project/workspace

## RULES
1. NEVER mention localhost - Director cannot access it
2. For dev servers, preview URL is https://${sessionId}-5173.csb.app (Vite) or https://${sessionId}-3000.csb.app (Next.js)
3. Files: ${files.length ? files.join(', ') : '(empty workspace)'}
`.trim()
}

// ============================================
// JSON PARSER
// ============================================
function parseJSON(raw: string): { ok: boolean; data?: any; error?: string } {
  try {
    // Remove markdown code blocks if present
    let clean = raw.trim()
    if (clean.startsWith('```json')) {
      clean = clean.slice(7)
    } else if (clean.startsWith('```')) {
      clean = clean.slice(3)
    }
    if (clean.endsWith('```')) {
      clean = clean.slice(0, -3)
    }
    clean = clean.trim()
    
    console.log('[DEBUG] Parsing JSON:', clean.substring(0, 200) + '...')
    const parsed = JSON.parse(clean)
    console.log('[DEBUG] Parsed successfully, actions count:', parsed.actions?.length || 0)
    return { ok: true, data: parsed }
  } catch (e) {
    console.error('[DEBUG] JSON parse error:', e)
    console.error('[DEBUG] Raw input was:', raw.substring(0, 500))
    return { ok: false, error: String(e) }
  }
}

// ============================================
// ERROR DETECTION
// ============================================
const TRANSIENT = [/ETIMEDOUT/i, /ECONNRESET/i, /socket hang up/i]
function isTransient(e: string): boolean {
  return TRANSIENT.some(p => p.test(e))
}

let lastErrorSig = ''
function isStagnant(errors: string[]): boolean {
  const sig = errors.sort().join('|')
  if (sig === lastErrorSig) return true
  lastErrorSig = sig
  return false
}

// ============================================
// MAIN ORCHESTRATION
// ============================================
export async function orchestrate(
  claudeKey: string,
  geminiKey: string,
  intent: string,
  sessionId: string,
  files: string[]
): Promise<OrchestrationResult> {
  lastErrorSig = ''
  const ctx = buildContext(sessionId, files)

  console.log('[DEBUG] Starting orchestration for:', intent)

  // 1. Architect analyzes
  console.log('[DEBUG] Calling Gemini (Architect)...')
  const archResponse = await callGemini(geminiKey, ARCHITECT_INTAKE_PROMPT, `Director: "${intent}"`, ctx)
  console.log('[DEBUG] Architect response:', archResponse.substring(0, 200))
  
  // Check if clarification needed
  const lower = archResponse.toLowerCase()
  if (['clarify', 'what would you like', 'can you specify'].some(k => lower.includes(k)) && 
      !['blueprint', 'engineering lead', 'proceed'].some(k => lower.includes(k))) {
    console.log('[DEBUG] Architect needs clarification')
    return { phase: 'clarification', architectMessage: archResponse, approved: false, finalActions: [] }
  }

  // 2. Engineer creates plan
  console.log('[DEBUG] Calling Claude (Engineer)...')
  const builderRaw = await callClaude(claudeKey, BUILDER_SYSTEM_PROMPT, 
    `Blueprint from Architect:\n${archResponse}\n\nDirector's request: "${intent}"`, ctx)
  console.log('[DEBUG] Engineer raw response:', builderRaw.substring(0, 300))
  
  const parsed = parseJSON(builderRaw)
  if (!parsed.ok) {
    console.error('[DEBUG] Failed to parse engineer response')
    return { 
      phase: 'escalate', 
      architectMessage: archResponse, 
      approved: false, 
      finalActions: [], 
      error: `Failed to parse engineer plan: ${parsed.error}` 
    }
  }
  
  const plan = parsed.data as BuilderResponse
  console.log('[DEBUG] Engineer plan has', plan.actions?.length || 0, 'actions')

  // 3. Architect reviews
  if (plan.actions?.length > 0) {
    console.log('[DEBUG] Calling Gemini for review...')
    const reviewRaw = await callGemini(geminiKey, ARCHITECT_REVIEW_PROMPT,
      `Intent: "${intent}"\nPlan: ${JSON.stringify(plan.actions, null, 2)}`, ctx)
    console.log('[DEBUG] Review response:', reviewRaw.substring(0, 200))
    
    const reviewParsed = parseJSON(reviewRaw)
    const review: ArchitectReview = reviewParsed.ok 
      ? reviewParsed.data 
      : { approved: reviewRaw.toLowerCase().includes('approved'), reasoning: reviewRaw }

    console.log('[DEBUG] Final result: approved=', review.approved, 'actions=', plan.actions.length)

    return {
      phase: 'complete',
      architectMessage: archResponse,
      builderPlan: plan,
      architectReview: review,
      approved: review.approved,
      finalActions: review.approved ? plan.actions : []
    }
  }

  console.log('[DEBUG] No actions in plan, returning empty')
  return { phase: 'complete', architectMessage: archResponse, builderPlan: plan, approved: true, finalActions: [] }
}

// ============================================
// FIX ORCHESTRATION
// ============================================
const FIX_PROMPT = `You are the Engineering Lead. Actions failed. Diagnose and fix.

Return JSON only:
{
  "diagnosis": "what went wrong",
  "userFacingSummary": "brief status (no jargon)",
  "category": "plumbing|logic|architectural",
  "actions": [{"type":"createFile"|"runCommand", ...}],
  "escalate": false
}`

const FIX_REVIEW = `Review this fix. Return JSON: {"approve": true/false, "escalate": false}`

export async function orchestrateFix(
  claudeKey: string,
  geminiKey: string,
  intent: string,
  failures: { action: string; error: string }[],
  sessionId: string,
  files: string[],
  attempt: number,
  silentRetry: number
): Promise<OrchestrationResult> {
  
  // Silent retry for transient
  if (failures.every(f => isTransient(f.error)) && silentRetry < 2) {
    return {
      phase: 'complete',
      approved: true,
      finalActions: failures.map(f => ({ type: 'runCommand' as const, command: f.action })),
      silentRetry: true,
      userFacingSummary: 'Retrying...'
    }
  }

  // Stagnation
  if (isStagnant(failures.map(f => f.error))) {
    return {
      phase: 'escalate',
      approved: false,
      finalActions: [],
      requiresDirectorInput: true,
      userFacingSummary: 'Same errors repeating'
    }
  }

  const ctx = buildContext(sessionId, files)

  // Engineer diagnoses
  const diagRaw = await callClaude(claudeKey, FIX_PROMPT,
    `Intent: "${intent}"\nAttempt: ${attempt}\nFailures:\n${failures.map(f => `- ${f.action}: ${f.error}`).join('\n')}`, ctx)
  
  const diag = parseJSON(diagRaw)
  if (!diag.ok) {
    return { phase: 'escalate', approved: false, finalActions: [], userFacingSummary: 'Parse error' }
  }

  const fix = diag.data as { category: string; actions: Action[]; escalate?: boolean; userFacingSummary?: string }

  if (fix.category === 'architectural' || fix.escalate) {
    return { phase: 'escalate', approved: false, finalActions: [], requiresDirectorInput: true, userFacingSummary: fix.userFacingSummary || 'Needs guidance' }
  }

  // Architect reviews fix
  const revRaw = await callGemini(geminiKey, FIX_REVIEW, `Fix: ${JSON.stringify(fix.actions)}`, ctx)
  const rev = parseJSON(revRaw)
  
  if (rev.ok && (rev.data.escalate || !rev.data.approve)) {
    return { phase: 'escalate', approved: false, finalActions: [], requiresDirectorInput: true }
  }

  return {
    phase: 'complete',
    approved: true,
    finalActions: fix.actions || [],
    userFacingSummary: fix.userFacingSummary || 'Fixing...',
    issuesResolved: failures.length
  }
}
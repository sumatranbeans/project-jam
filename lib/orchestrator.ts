// lib/orchestrator.ts
import { callClaude, BUILDER_SYSTEM_PROMPT } from './claude'
import { callGemini, ARCHITECT_INTAKE_PROMPT, ARCHITECT_REVIEW_PROMPT } from './gemini'

// ============================================
// TYPES
// ============================================
export type ActionType = 'createFile' | 'runCommand'

export type Action = {
  type: ActionType
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
  concerns: string[]
}

export type OrchestrationResult = {
  phase: 'clarification' | 'building' | 'complete' | 'escalate'
  architectMessage?: string
  builderPlan?: BuilderResponse
  architectReview?: ArchitectReview
  approved: boolean
  finalActions: Action[]
  error?: string
  requiresDirectorInput?: boolean
  silentRetry?: boolean
  resetStrategy?: string
  targetPath?: string
  userFacingSummary?: string
  issuesResolved?: number
}

// ============================================
// ENVIRONMENT CONTEXT (CodeSandbox)
// ============================================
export function buildEnvironmentContext(sessionId: string, fileTree: string[]): string {
  return `
### RUNTIME ENVIRONMENT
- **Provider**: CodeSandbox (microVM with snapshot/restore)
- **Session ID**: ${sessionId}
- **Access**: Remote cloud environment. Director accesses via Preview URL.
- **Preview URL Pattern**: https://${sessionId}-{PORT}.csb.app
  - Example Vite (port 5173): https://${sessionId}-5173.csb.app
  - Example Next.js (port 3000): https://${sessionId}-3000.csb.app

### HOW DEV SERVERS WORK HERE
- Run \`npm run dev\` normally — the system handles background execution
- When the port opens, it's automatically exposed at the Preview URL
- The Director can click the Preview URL and see the live app immediately

### CRITICAL RULES
1. NEVER mention localhost or 127.0.0.1 — the Director cannot access them
2. After starting a dev server, tell the Director the exact Preview URL
3. For Vite projects, the default port is 5173
4. Files persist — the sandbox can be resumed later

### CURRENT WORKSPACE STATE
Files: ${fileTree.length === 0 ? '(empty workspace — fresh start)' : fileTree.join(', ')}
`.trim()
}

// ============================================
// UTILITIES
// ============================================
function sanitizeError(error: string): string {
  return error.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*/g, '[TS]').replace(/\s+/g, ' ').trim()
}

const TRANSIENT = [/ETIMEDOUT/i, /ECONNRESET/i, /ENOTFOUND/i, /socket hang up/i, /50[0234]/]
function isTransientError(e: string): boolean {
  return TRANSIENT.some(p => p.test(e))
}

let prevSig: string | null = null
function detectStagnation(errors: string[]): boolean {
  const sig = errors.map(sanitizeError).sort().join('|')
  if (sig === prevSig) return true
  prevSig = sig
  return false
}

export function resetLoopDetection() { prevSig = null }

function parseJSON(raw: string): { ok: boolean; data?: unknown; error?: string } {
  try {
    return { ok: true, data: JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// ============================================
// FIX PROMPTS
// ============================================
const ENGINEER_FIX_PROMPT = `You are the Engineering Lead. Some actions failed. Diagnose and fix.

Respond with JSON only:
{
  "diagnosis": "what went wrong",
  "userFacingSummary": "brief status for Director (no technical jargon)",
  "failureCategory": "plumbing|logic|architectural",
  "actions": [{ "type": "createFile"|"runCommand", "path": "...", "content": "...", "command": "..." }],
  "escalate": false,
  "response": "summary of fix"
}

Rules:
- Don't repeat the exact failed command — fix the root cause first
- NEVER suggest localhost URLs — use the CodeSandbox preview URL pattern
- If dependencies are missing, install them
- If a directory doesn't exist, create files with full paths`

const ARCHITECT_FIX_REVIEW = `You are the Product Architect reviewing a fix proposal.

Respond with JSON only:
{
  "assessment": "your analysis",
  "approve_retry": true|false,
  "escalate_to_director": false,
  "message": "brief message"
}`

// ============================================
// MAIN ORCHESTRATION
// ============================================
export async function orchestrate(
  claudeKey: string,
  geminiKey: string,
  directorIntent: string,
  sessionId: string,
  fileTree: string[]
): Promise<OrchestrationResult> {
  resetLoopDetection()
  const context = buildEnvironmentContext(sessionId, fileTree)

  // Phase 1: Architect blueprints
  const architectResponse = await callGemini(geminiKey, ARCHITECT_INTAKE_PROMPT, `Director's request: "${directorIntent}"`, context)

  const lower = architectResponse.toLowerCase()
  const isHandoff = ['engineering lead', 'blueprint', 'implement', 'build', 'create', 'proceed'].some(k => lower.includes(k))
  const isClarification = ['what would you like', 'could you clarify', 'can you specify'].some(k => lower.includes(k)) && !isHandoff

  if (isClarification) {
    return { phase: 'clarification', architectMessage: architectResponse, approved: false, finalActions: [] }
  }

  // Phase 2: Engineer builds
  const builderRaw = await callClaude(claudeKey, BUILDER_SYSTEM_PROMPT, `Architect's blueprint:\n${architectResponse}\n\nDirector's original request: "${directorIntent}"`, context)
  const builderParsed = parseJSON(builderRaw)
  
  if (!builderParsed.ok) {
    return { phase: 'building', architectMessage: architectResponse, approved: false, finalActions: [], error: builderParsed.error }
  }

  const builderPlan = builderParsed.data as BuilderResponse

  // Phase 3: Architect reviews
  if (builderPlan.actions?.length > 0) {
    const reviewRaw = await callGemini(geminiKey, ARCHITECT_REVIEW_PROMPT, `Director's intent: "${directorIntent}"\n\nEngineer's plan:\n${JSON.stringify(builderPlan, null, 2)}`, context)
    const reviewParsed = parseJSON(reviewRaw)
    
    let review: ArchitectReview
    if (reviewParsed.ok) {
      review = reviewParsed.data as ArchitectReview
    } else {
      // Fallback: check if response contains approval language
      review = { 
        approved: reviewRaw.toLowerCase().includes('approv') && !reviewRaw.toLowerCase().includes('not approv'), 
        reasoning: reviewRaw, 
        concerns: [] 
      }
    }

    return {
      phase: 'complete',
      architectMessage: architectResponse,
      builderPlan,
      architectReview: review,
      approved: review.approved,
      finalActions: review.approved ? builderPlan.actions : []
    }
  }

  return { phase: 'complete', architectMessage: architectResponse, builderPlan, approved: true, finalActions: [] }
}

// ============================================
// FIX ORCHESTRATION (Self-Correction)
// ============================================
export async function orchestrateFix(
  claudeKey: string,
  geminiKey: string,
  intent: string,
  failures: { action: string; error: string }[],
  sessionId: string,
  fileTree: string[],
  attempt: number,
  silentRetry: number = 0
): Promise<OrchestrationResult> {
  
  // Silent retry for transient errors (network glitches)
  if (failures.every(f => isTransientError(f.error)) && silentRetry < 2) {
    return {
      phase: 'complete',
      approved: true,
      finalActions: failures.map(f => ({ type: 'runCommand' as ActionType, command: f.action })),
      silentRetry: true,
      userFacingSummary: 'Retrying...'
    }
  }

  // Stagnation check — same errors repeating
  if (detectStagnation(failures.map(f => f.error))) {
    return {
      phase: 'escalate',
      approved: false,
      finalActions: [],
      error: 'Same errors repeating. Director guidance needed.',
      requiresDirectorInput: true,
      userFacingSummary: 'Need guidance'
    }
  }

  const context = buildEnvironmentContext(sessionId, fileTree)

  // Engineer diagnoses
  const diagnosisRaw = await callClaude(claudeKey, ENGINEER_FIX_PROMPT, `
Original intent: "${intent}"
Attempt: ${attempt}
Failed actions:
${failures.map(f => `- ${f.action}\n  Error: ${f.error}`).join('\n')}
`, context)

  const diagnosisParsed = parseJSON(diagnosisRaw)
  if (!diagnosisParsed.ok) {
    return { phase: 'escalate', approved: false, finalActions: [], error: 'Could not parse fix', userFacingSummary: 'Technical issue' }
  }

  const fix = diagnosisParsed.data as {
    diagnosis: string
    userFacingSummary?: string
    failureCategory: string
    actions: Action[]
    escalate?: boolean
  }

  // Architectural issues need Director input
  if (fix.failureCategory === 'architectural' || fix.escalate) {
    return { 
      phase: 'escalate', 
      approved: false, 
      finalActions: [], 
      requiresDirectorInput: true, 
      userFacingSummary: fix.userFacingSummary || 'Need new approach' 
    }
  }

  // Architect reviews the fix
  const reviewRaw = await callGemini(geminiKey, ARCHITECT_FIX_REVIEW, `
Original intent: "${intent}"
Attempt: ${attempt}
Proposed fix: ${JSON.stringify(fix.actions)}
`, context)

  const reviewParsed = parseJSON(reviewRaw)
  if (reviewParsed.ok) {
    const review = reviewParsed.data as { approve_retry: boolean; escalate_to_director: boolean }
    if (review.escalate_to_director || !review.approve_retry) {
      return { phase: 'escalate', approved: false, finalActions: [], requiresDirectorInput: true, userFacingSummary: 'Need guidance' }
    }
  }

  return {
    phase: 'complete',
    approved: true,
    finalActions: fix.actions || [],
    userFacingSummary: fix.userFacingSummary || 'Fixing...',
    issuesResolved: failures.length
  }
}
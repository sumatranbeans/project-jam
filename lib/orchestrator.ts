import { callClaude, BUILDER_SYSTEM_PROMPT } from './claude'
import { callGemini, ARCHITECT_INTAKE_PROMPT, ARCHITECT_REVIEW_PROMPT } from './gemini'

// ============================================
// TYPES
// ============================================
export type ActionType = 'createFile' | 'runCommand' | 'createRepo' | 'commit'

export type Action = {
  type: ActionType
  path?: string
  content?: string
  command?: string
  name?: string
  message?: string
}

export type BuilderResponse = {
  actions: Action[]
  requestReview?: boolean
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
// ENVIRONMENT CONTEXT INJECTION
// ============================================
export function buildEnvironmentContext(sandboxId: string, fileTree: string[], executionHistory?: string[]): string {
  return `
### RUNTIME ENVIRONMENT
- **Provider**: E2B Cloud Sandbox (Firecracker MicroVM)
- **Sandbox ID**: ${sandboxId}
- **Access**: Remote-only. The Director is NOT on this machine. There is NO localhost access.
- **Preview URL Pattern**: https://{PORT}-${sandboxId}.e2b.app
  - Vite (port 5173): https://5173-${sandboxId}.e2b.app
  - Next.js (port 3000): https://3000-${sandboxId}.e2b.app
  - Python HTTP (port 8000): https://8000-${sandboxId}.e2b.app
- **Server Execution**: Background execution is handled automatically. Just run the command.
- **File Access**: Files exist only in sandbox. Director can view via Preview URL or Files panel.

### CRITICAL RULES
1. NEVER mention localhost, 127.0.0.1, or any local URL — the Director cannot access them
2. When a server starts, tell Director the preview URL using the pattern above
3. For Vite, ensure --host 0.0.0.0 flag is used to expose the server

### CURRENT SANDBOX STATE
Files: ${fileTree.length === 0 ? '(empty - fresh sandbox, no git, no node_modules)' : fileTree.join(', ')}
${executionHistory?.length ? `\nRecent history:\n${executionHistory.slice(-5).join('\n')}` : ''}
`.trim()
}

// ============================================
// UTILITIES
// ============================================
function sanitizeError(error: string): string {
  return error
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*/g, '[TS]')
    .replace(/0x[a-fA-F0-9]+/g, '[ADDR]')
    .replace(/[a-f0-9-]{36}/gi, '[UUID]')
    .replace(/\s+/g, ' ')
    .trim()
}

const TRANSIENT_PATTERNS = [/ETIMEDOUT/i, /ECONNRESET/i, /ENOTFOUND/i, /socket hang up/i, /50[0234]/]
function isTransientError(error: string): boolean {
  return TRANSIENT_PATTERNS.some(p => p.test(error))
}

function modifiesDependencies(actions: Action[]): boolean {
  return actions.some(a => 
    a.path?.includes('package.json') ||
    a.command?.match(/npm\s+(install|uninstall|add|remove)\s/i)
  )
}

let prevErrorSig: string | null = null
function detectStagnation(errors: string[]): boolean {
  const sig = errors.map(sanitizeError).sort().join('|')
  if (sig === prevErrorSig) return true
  prevErrorSig = sig
  return false
}

export function resetLoopDetection(): void { prevErrorSig = null }

function parseJSON(raw: string): { ok: boolean; data?: unknown; error?: string } {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    return { ok: true, data: JSON.parse(cleaned) }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// ============================================
// FIX PROMPTS
// ============================================
const ENGINEER_FIX_PROMPT = `You are the Engineering Lead. Some actions failed. Diagnose and fix.

Respond with JSON:
{
  "diagnosis": "what went wrong",
  "userFacingSummary": "brief status for Director (no jargon)",
  "failureCategory": "plumbing|logic|architectural",
  "resetStrategy": "continue|purge_directory|full_reset",
  "targetPath": "path if purging",
  "actions": [{ "type": "...", ... }],
  "escalate": false,
  "response": "summary"
}

Rules:
- If git failed, likely need git init first
- If npm failed, check directory
- Don't repeat failed commands — fix root cause
- NEVER suggest localhost URLs`

const ARCHITECT_FIX_REVIEW = `You are the Product Architect reviewing a fix proposal.

Respond with JSON:
{
  "assessment": "analysis",
  "approve_retry": true,
  "needs_reblueprint": false,
  "escalate_to_director": false,
  "message": "..."
}`

// ============================================
// MAIN ORCHESTRATION
// ============================================
export async function orchestrate(
  claudeKey: string,
  geminiKey: string,
  directorIntent: string,
  sandboxId: string,
  fileTree: string[],
  executionHistory?: string[]
): Promise<OrchestrationResult> {
  resetLoopDetection()
  const context = buildEnvironmentContext(sandboxId, fileTree, executionHistory)

  // Phase 1: Architect intake
  const architectResponse = await callGemini(geminiKey, ARCHITECT_INTAKE_PROMPT, `Director's request: "${directorIntent}"`, context)

  const lower = architectResponse.toLowerCase()
  const isHandoff = ['engineering lead', 'blueprint', 'execute', 'implement', 'build', 'create', 'proceed'].some(k => lower.includes(k))
  const isClarification = ['what would you like', 'could you clarify', 'what are we building'].some(k => lower.includes(k)) && !isHandoff

  if (isClarification) {
    return { phase: 'clarification', architectMessage: architectResponse, approved: false, finalActions: [] }
  }

  // Phase 2: Engineer builds
  const builderRaw = await callClaude(claudeKey, BUILDER_SYSTEM_PROMPT, `Architect's blueprint:\n${architectResponse}\n\nDirector's request: "${directorIntent}"`, context)
  const builderParsed = parseJSON(builderRaw)
  
  if (!builderParsed.ok) {
    return { phase: 'building', architectMessage: architectResponse, approved: false, finalActions: [], error: builderParsed.error }
  }

  const builderPlan = builderParsed.data as BuilderResponse

  // Phase 3: Architect reviews (only if there are actions)
  if (builderPlan.actions?.length > 0) {
    const reviewRaw = await callGemini(geminiKey, ARCHITECT_REVIEW_PROMPT, `Intent: "${directorIntent}"\n\nPlan:\n${JSON.stringify(builderPlan, null, 2)}`, context)
    const reviewParsed = parseJSON(reviewRaw)
    
    let review: ArchitectReview
    if (reviewParsed.ok) {
      review = reviewParsed.data as ArchitectReview
    } else {
      review = { approved: reviewRaw.toLowerCase().includes('approv'), reasoning: reviewRaw, concerns: [] }
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
// FIX ORCHESTRATION
// ============================================
export async function orchestrateFix(
  claudeKey: string,
  geminiKey: string,
  originalIntent: string,
  failedActions: { action: string; error: string }[],
  sandboxId: string,
  fileTree: string[],
  attemptNumber: number,
  silentRetryCount: number = 0
): Promise<OrchestrationResult> {
  
  // Silent retry for transient errors
  if (failedActions.every(f => isTransientError(f.error)) && silentRetryCount < 2) {
    return {
      phase: 'complete',
      approved: true,
      finalActions: failedActions.map(f => ({ type: 'runCommand' as ActionType, command: f.action })),
      silentRetry: true,
      userFacingSummary: 'Retrying...'
    }
  }

  // Stagnation check
  if (detectStagnation(failedActions.map(f => f.error))) {
    return {
      phase: 'escalate',
      approved: false,
      finalActions: [],
      error: 'Same errors repeating. Need Director guidance.',
      requiresDirectorInput: true,
      userFacingSummary: 'Need guidance'
    }
  }

  const context = buildEnvironmentContext(sandboxId, fileTree, failedActions.map(f => `FAILED: ${f.action}`))

  // Engineer diagnoses
  const diagnosisRaw = await callClaude(claudeKey, ENGINEER_FIX_PROMPT, `
Intent: "${originalIntent}"
Failed (attempt ${attemptNumber}):
${failedActions.map(f => `- ${f.action}: ${f.error}`).join('\n')}
`, context)

  const diagnosisParsed = parseJSON(diagnosisRaw)
  if (!diagnosisParsed.ok) {
    return { phase: 'escalate', approved: false, finalActions: [], error: 'Could not parse fix plan', userFacingSummary: 'Technical issue' }
  }

  const fix = diagnosisParsed.data as {
    diagnosis: string
    userFacingSummary?: string
    failureCategory: string
    resetStrategy: string
    targetPath?: string
    actions: Action[]
    escalate?: boolean
    response: string
  }

  if (fix.failureCategory === 'architectural' || fix.escalate) {
    return { phase: 'escalate', approved: false, finalActions: [], error: 'Architectural issue', requiresDirectorInput: true, userFacingSummary: fix.userFacingSummary || 'Need new approach' }
  }

  // Architect reviews fix
  const reviewRaw = await callGemini(geminiKey, ARCHITECT_FIX_REVIEW, `
Intent: "${originalIntent}"
Attempt ${attemptNumber}
Category: ${fix.failureCategory}
Fix: ${JSON.stringify(fix.actions)}
${modifiesDependencies(fix.actions || []) ? '⚠️ DEPENDENCY CHANGE DETECTED' : ''}
`, context)

  const reviewParsed = parseJSON(reviewRaw)
  if (reviewParsed.ok) {
    const review = reviewParsed.data as { approve_retry: boolean; escalate_to_director: boolean; needs_reblueprint: boolean }
    if (review.escalate_to_director || review.needs_reblueprint) {
      return { phase: 'escalate', approved: false, finalActions: [], requiresDirectorInput: true, userFacingSummary: 'Need guidance' }
    }
    if (!review.approve_retry) {
      return { phase: 'escalate', approved: false, finalActions: [], error: 'Fix not approved' }
    }
  }

  return {
    phase: 'complete',
    approved: true,
    finalActions: fix.actions || [],
    resetStrategy: fix.resetStrategy,
    targetPath: fix.targetPath,
    userFacingSummary: fix.userFacingSummary || 'Fixing...',
    issuesResolved: failedActions.length
  }
}
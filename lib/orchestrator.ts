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
// ENVIRONMENT CONTEXT INJECTION (P0 Hotfix)
// ============================================
export function buildEnvironmentContext(sandboxId: string, fileTree: string[], executionHistory?: string[]): string {
  const context = `
### RUNTIME ENVIRONMENT
- **Provider**: E2B Cloud Sandbox (Firecracker MicroVM)
- **Sandbox ID**: ${sandboxId}
- **Access**: Remote-only. There is NO localhost. The Director cannot access localhost URLs.
- **Preview URL Pattern**: https://${sandboxId}-{PORT}.e2b.dev
  - Example: https://${sandboxId}-5173.e2b.dev (Vite)
  - Example: https://${sandboxId}-3000.e2b.dev (Next.js)
  - Example: https://${sandboxId}-8080.e2b.dev (Python/Node server)
- **Timeout**: Blocking commands >60s will be killed. For servers, the system handles background execution automatically.
- **File Access**: Director cannot directly access sandbox files. Files must be served via preview URL or downloaded.

### CRITICAL RULES
1. NEVER suggest "localhost" or "127.0.0.1" — these are inaccessible to the Director
2. ALWAYS use the preview URL pattern above when telling Director how to view the app
3. For dev servers (npm run dev, python -m http.server, etc.), just run the command — background execution is handled automatically
4. When build completes, tell Director the exact preview URL: https://${sandboxId}-{PORT}.e2b.dev

### CURRENT SANDBOX STATE
- **Files**: ${fileTree.length === 0 ? '(empty sandbox)' : fileTree.join(', ')}
${fileTree.length === 0 ? '- **Note**: Fresh sandbox. No git repo initialized. No node_modules.' : ''}
${executionHistory && executionHistory.length > 0 ? `\n### RECENT EXECUTION HISTORY\n${executionHistory.slice(-10).join('\n')}` : ''}
`
  return context.trim()
}

// ============================================
// SAFETY TRIGGER #3: Error Sanitization
// ============================================
function sanitizeError(error: string): string {
  return error
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '[TIMESTAMP]')
    .replace(/\b\d{10,13}\b/g, '[UNIX_TS]')
    .replace(/0x[a-fA-F0-9]+/g, '[ADDR]')
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
    .replace(/:\d+:\d+/g, ':[LINE]')
    .replace(/\/tmp\/[^\s]+/g, '[TMP_PATH]')
    .replace(/sandbox[_-]?[a-z0-9]+/gi, '[SANDBOX]')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================
// SAFETY TRIGGER #4: Transient Error Detection
// ============================================
const TRANSIENT_ERROR_PATTERNS = [
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /ENOTFOUND/i,
  /ECONNREFUSED/i,
  /socket hang up/i,
  /network error/i,
  /503\b/,
  /504\b/,
  /500\b/,
  /502\b/,
  /getaddrinfo/i,
  /EAI_AGAIN/i,
]

function isTransientError(error: string): boolean {
  return TRANSIENT_ERROR_PATTERNS.some(pattern => pattern.test(error))
}

// ============================================
// SAFETY TRIGGER #2: Dependency Sentinel
// ============================================
function modifiesDependencies(actions: Action[]): boolean {
  return actions.some(a => 
    a.path?.includes('package.json') ||
    a.path?.includes('package-lock.json') ||
    a.path?.includes('yarn.lock') ||
    a.command?.match(/npm\s+(install|uninstall|i|un|add|remove|r)\s/i) ||
    a.command?.match(/yarn\s+(add|remove)\s/i) ||
    a.command?.match(/pnpm\s+(add|remove)\s/i)
  )
}

// ============================================
// Loop Detection
// ============================================
let previousErrorSignature: string | null = null

function computeErrorSignature(errors: string[]): string {
  const sanitized = errors.map(sanitizeError).sort().join('|')
  let hash = 0
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(16)
}

function detectStagnation(errors: string[]): boolean {
  const signature = computeErrorSignature(errors)
  if (signature === previousErrorSignature) {
    return true
  }
  previousErrorSignature = signature
  return false
}

export function resetLoopDetection(): void {
  previousErrorSignature = null
}

// ============================================
// JSON Validation
// ============================================
function validateJSON(raw: string): { valid: boolean; parsed?: unknown; error?: string } {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { valid: true, parsed }
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e}` }
  }
}

// ============================================
// FIX PROMPTS
// ============================================
const ENGINEER_FIX_PROMPT = `You are the Engineering Lead (Claude Opus 4.5).

Some actions failed. Diagnose and fix.

Your response MUST include:
1. diagnosis: What went wrong and why (technical, for logs)
2. userFacingSummary: A brief, professional summary for the Director (e.g., "Adjusting project structure" or "Configuring build environment") - NO technical jargon
3. failureCategory: "plumbing" (environment/setup), "logic" (code errors), or "architectural" (blueprint was fundamentally wrong)
4. resetStrategy: "continue" (proceed with current state), "purge_directory" (clean specific path), or "full_reset" (need fresh sandbox)
5. actions: The fix actions

Rules:
- If git commands failed, you likely need "git init" first
- If npm failed, check you're in the right directory
- Don't repeat the exact same command that failed — fix the root cause
- If failureCategory is "architectural", set escalate: true
- userFacingSummary should be calm and professional, not alarming
- NEVER suggest localhost URLs — use the E2B preview URL pattern from the environment context

Respond with JSON only:
{
  "diagnosis": "technical details for logs",
  "userFacingSummary": "brief Director-facing status",
  "failureCategory": "plumbing|logic|architectural",
  "resetStrategy": "continue|purge_directory|full_reset",
  "targetPath": "path/to/purge (if purging)",
  "actions": [{ "type": "...", ... }],
  "escalate": false,
  "response": "summary"
}`

const ARCHITECT_FIX_REVIEW_PROMPT = `You are the Product Architect (Gemini 3 Pro).

The Engineering Lead proposed a fix for failed actions. Review it.

Rules:
- If failureCategory is "architectural", reject and prepare to re-blueprint
- If the fix modifies dependencies (package.json, npm install new packages), scrutinize carefully — this may be scope creep
- If the fix looks reasonable for the failure type, approve
- If you see the same error pattern repeating, escalate to Director

Respond with JSON only:
{
  "assessment": "your analysis",
  "approve_retry": true,
  "needs_reblueprint": false,
  "escalate_to_director": false,
  "dependency_concern": "",
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
  
  // P0 HOTFIX: Inject environment context
  const context = buildEnvironmentContext(sandboxId, fileTree, executionHistory)

  // PHASE 1: Architect intake
  const architectResponse = await callGemini(
    geminiKey,
    ARCHITECT_INTAKE_PROMPT,
    `Director's request: "${directorIntent}"`,
    context
  )

  // Detect if clarification vs handoff
  const lower = architectResponse.toLowerCase()
  const isHandoff = lower.includes('engineering lead') ||
                    lower.includes('blueprint') ||
                    lower.includes('execute') ||
                    lower.includes('implement') ||
                    lower.includes('build') ||
                    lower.includes('create')
  
  const isClarification = (lower.includes('what would you like') ||
                          lower.includes('could you clarify') ||
                          lower.includes('what are we building') ||
                          lower.match(/\?[\s]*$/)) && !isHandoff

  if (isClarification) {
    return {
      phase: 'clarification',
      architectMessage: architectResponse,
      approved: false,
      finalActions: []
    }
  }

  // PHASE 2: Engineer builds
  const engineerPrompt = `Product Architect's blueprint:\n${architectResponse}\n\nDirector's original request: "${directorIntent}"`
  
  const builderRaw = await callClaude(
    claudeKey,
    BUILDER_SYSTEM_PROMPT,
    engineerPrompt,
    context
  )

  const builderValidation = validateJSON(builderRaw)
  if (!builderValidation.valid) {
    return {
      phase: 'building',
      architectMessage: architectResponse,
      approved: false,
      finalActions: [],
      error: `Engineer response error: ${builderValidation.error}`
    }
  }

  const builderPlan = builderValidation.parsed as BuilderResponse

  // PHASE 3: Architect reviews
  if (builderPlan.actions && builderPlan.actions.length > 0) {
    const reviewPrompt = `Director's intent: "${directorIntent}"\n\nEngineering Lead's plan:\n${JSON.stringify(builderPlan, null, 2)}`
    
    const reviewRaw = await callGemini(
      geminiKey,
      ARCHITECT_REVIEW_PROMPT,
      reviewPrompt,
      context
    )

    const reviewValidation = validateJSON(reviewRaw)
    let architectReview: ArchitectReview
    
    if (!reviewValidation.valid) {
      const approved = reviewRaw.toLowerCase().includes('approv')
      architectReview = { approved, reasoning: reviewRaw, concerns: [] }
    } else {
      architectReview = reviewValidation.parsed as ArchitectReview
    }

    return {
      phase: 'complete',
      architectMessage: architectResponse,
      builderPlan,
      architectReview,
      approved: architectReview.approved,
      finalActions: architectReview.approved ? builderPlan.actions : []
    }
  }

  return {
    phase: 'complete',
    architectMessage: architectResponse,
    builderPlan,
    approved: true,
    finalActions: []
  }
}

// ============================================
// FIX ORCHESTRATION (Self-Correction)
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
  
  // SAFETY TRIGGER #4: Silent retry for transient errors
  const allTransient = failedActions.every(f => isTransientError(f.error))
  if (allTransient && silentRetryCount < 2) {
    return {
      phase: 'complete',
      approved: true,
      finalActions: failedActions.map(f => ({ type: 'runCommand' as ActionType, command: f.action })),
      silentRetry: true,
      userFacingSummary: 'Retrying connection...'
    }
  }

  // SAFETY TRIGGER #3: Stagnation detection
  const errorMessages = failedActions.map(f => f.error)
  if (detectStagnation(errorMessages)) {
    return {
      phase: 'escalate',
      approved: false,
      finalActions: [],
      error: 'The team has hit a strategic impasse. Reviewing the failure logs is required for a creative pivot.',
      requiresDirectorInput: true,
      userFacingSummary: 'Strategic review needed'
    }
  }

  const executionHistory = failedActions.map(f => `FAILED: ${f.action} → ${f.error}`)
  
  // P0 HOTFIX: Inject environment context
  const context = buildEnvironmentContext(sandboxId, fileTree, executionHistory)

  // Engineer diagnoses
  const diagnosisPrompt = `
Original Director intent: "${originalIntent}"

These actions FAILED (attempt #${attemptNumber}):
${failedActions.map(f => `- ${f.action}\n  Error: ${f.error}`).join('\n')}

Diagnose and provide a fix.`

  const engineerFixRaw = await callClaude(claudeKey, ENGINEER_FIX_PROMPT, diagnosisPrompt, context)
  
  const fixValidation = validateJSON(engineerFixRaw)
  if (!fixValidation.valid) {
    return {
      phase: 'escalate',
      approved: false,
      finalActions: [],
      error: 'Engineer could not produce valid fix plan',
      userFacingSummary: 'Technical review needed'
    }
  }

  const fixPlan = fixValidation.parsed as {
    diagnosis: string
    userFacingSummary?: string
    failureCategory: 'plumbing' | 'logic' | 'architectural'
    resetStrategy: 'continue' | 'purge_directory' | 'full_reset'
    targetPath?: string
    actions: Action[]
    escalate?: boolean
    response: string
  }

  // Architectural failure = immediate escalate
  if (fixPlan.failureCategory === 'architectural' || fixPlan.escalate) {
    return {
      phase: 'escalate',
      architectMessage: 'The team has identified a fundamental approach issue that requires Director input.',
      approved: false,
      finalActions: [],
      error: 'Architectural revision needed',
      requiresDirectorInput: true,
      userFacingSummary: fixPlan.userFacingSummary || 'Approach review needed'
    }
  }

  // SAFETY TRIGGER #2: Dependency Sentinel
  const hasDependencyChanges = modifiesDependencies(fixPlan.actions || [])
  
  // Architect reviews fix
  const reviewPrompt = `
Original intent: "${originalIntent}"
Attempt #${attemptNumber}
Failure category: ${fixPlan.failureCategory}

Failed actions:
${failedActions.map(f => `- ${f.action}: ${f.error}`).join('\n')}

Engineer's diagnosis: ${fixPlan.diagnosis}
Engineer's reset strategy: ${fixPlan.resetStrategy}
Engineer's proposed fix: ${JSON.stringify(fixPlan.actions, null, 2)}

${hasDependencyChanges ? '⚠️ DEPENDENCY SENTINEL: This fix modifies package.json or installs new packages. Scrutinize carefully.' : ''}
`

  const architectReviewRaw = await callGemini(geminiKey, ARCHITECT_FIX_REVIEW_PROMPT, reviewPrompt, context)
  
  const reviewValidation = validateJSON(architectReviewRaw)
  
  let approveRetry = true
  let escalateToDirector = false
  let needsReblueprint = false
  let architectMessage = ''

  if (reviewValidation.valid) {
    const review = reviewValidation.parsed as {
      assessment: string
      approve_retry: boolean
      needs_reblueprint: boolean
      escalate_to_director: boolean
      dependency_concern?: string
      message: string
    }
    approveRetry = review.approve_retry
    escalateToDirector = review.escalate_to_director
    needsReblueprint = review.needs_reblueprint
    architectMessage = review.message || review.assessment
  }

  if (escalateToDirector || needsReblueprint) {
    return {
      phase: 'escalate',
      architectMessage: 'Director, the team has hit a strategic impasse. Reviewing the failure logs is required for a creative pivot.',
      builderPlan: { actions: fixPlan.actions, response: fixPlan.response },
      approved: false,
      finalActions: [],
      error: needsReblueprint ? 'Architect requests re-blueprint' : 'Escalated to Director',
      requiresDirectorInput: true,
      userFacingSummary: 'Strategic review needed'
    }
  }

  if (!approveRetry) {
    return {
      phase: 'escalate',
      architectMessage: 'Architect did not approve the fix',
      approved: false,
      finalActions: [],
      error: architectMessage,
      userFacingSummary: 'Fix approach rejected'
    }
  }

  return {
    phase: 'complete',
    approved: true,
    finalActions: fixPlan.actions || [],
    resetStrategy: fixPlan.resetStrategy,
    targetPath: fixPlan.targetPath,
    userFacingSummary: fixPlan.userFacingSummary || 'Adjusting configuration...',
    issuesResolved: failedActions.length
  }
}
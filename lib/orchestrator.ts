import { callClaude, BUILDER_SYSTEM_PROMPT } from './claude'
import { callGemini, ARCHITECT_INTAKE_PROMPT, ARCHITECT_REVIEW_PROMPT } from './gemini'

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
  requestReview: boolean
  response: string
}

export type ArchitectReview = {
  approved: boolean
  reasoning: string
  concerns: string[]
}

export type OrchestrationResult = {
  phase: 'clarification' | 'building' | 'review' | 'complete' | 'loop_detected'
  architectMessage?: string
  builderPlan?: BuilderResponse
  architectReview?: ArchitectReview
  approved: boolean
  finalActions: Action[]
  error?: string
}

// Loop detection: track file states
const recentFileStates: string[] = []

function detectLoop(fileTree: string[]): boolean {
  const currentState = JSON.stringify(fileTree.sort())
  if (recentFileStates.length >= 2) {
    const lastTwo = recentFileStates.slice(-2)
    if (lastTwo[0] === currentState && lastTwo[1] === currentState) {
      return true // Same state twice in a row
    }
  }
  recentFileStates.push(currentState)
  if (recentFileStates.length > 5) recentFileStates.shift()
  return false
}

function validateJSON(raw: string): { valid: boolean; parsed?: unknown; error?: string } {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { valid: true, parsed }
  } catch (e) {
    return { valid: false, error: `Invalid JSON: ${e}` }
  }
}

function buildContext(fileTree: string[], tasksContent?: string): string {
  let context = `File tree:\n${fileTree.map(f => `- ${f}`).join('\n')}`
  if (tasksContent) {
    context += `\n\nActive Ledger (tasks.md):\n${tasksContent}`
  }
  return context
}

export async function orchestrate(
  claudeKey: string,
  geminiKey: string,
  directorIntent: string,
  fileTree: string[],
  tasksContent?: string
): Promise<OrchestrationResult> {
  
  // Loop detection
  if (detectLoop(fileTree)) {
    return {
      phase: 'loop_detected',
      approved: false,
      finalActions: [],
      error: 'Loop detected: file state unchanged after multiple exchanges. Escalating to Director.'
    }
  }

  const context = buildContext(fileTree, tasksContent)

  // PHASE 1: Architect intake
  const architectResponse = await callGemini(
    geminiKey,
    ARCHITECT_INTAKE_PROMPT,
    `Director's request: "${directorIntent}"`,
    context
  )

  // Check if Architect is handing off or clarifying
  const lowerResponse = architectResponse.toLowerCase()
  const isHandoff = lowerResponse.includes('hand off') || 
                    lowerResponse.includes('handoff') || 
                    lowerResponse.includes('engineering lead') ||
                    lowerResponse.includes('blueprint') ||
                    lowerResponse.includes('build') ||
                    lowerResponse.includes('implement') ||
                    lowerResponse.includes('create')
  
  const isClarification = lowerResponse.includes('what would you like') ||
                          lowerResponse.includes('could you clarify') ||
                          lowerResponse.includes('can you tell me more') ||
                          lowerResponse.includes('?')

  // If clarification needed, stop here
  if (isClarification && !isHandoff) {
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

  // Validate JSON from builder
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

  // PHASE 3: Check if review needed
  const hasHighRiskActions = builderPlan.actions?.some(a => 
    a.type === 'commit' || 
    a.command?.includes('rm ') || 
    a.command?.includes('delete')
  )
  
  const needsReview = builderPlan.requestReview || hasHighRiskActions || (builderPlan.actions?.length > 0)

  if (!needsReview) {
    return {
      phase: 'complete',
      architectMessage: architectResponse,
      builderPlan,
      approved: true,
      finalActions: builderPlan.actions || []
    }
  }

  // PHASE 4: Architect reviews
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
    // If review JSON fails, check for approval keywords
    const approved = reviewRaw.toLowerCase().includes('approv')
    architectReview = {
      approved,
      reasoning: reviewRaw,
      concerns: []
    }
  } else {
    architectReview = reviewValidation.parsed as ArchitectReview
  }

  // APPROVAL GATE: Only execute if approved
  return {
    phase: 'complete',
    architectMessage: architectResponse,
    builderPlan,
    architectReview,
    approved: architectReview.approved,
    finalActions: architectReview.approved ? (builderPlan.actions || []) : []
  }
}
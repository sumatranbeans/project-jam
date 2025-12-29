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
  thinking: string
  actions: Action[]
  response: string
}

export type ArchitectResponse = {
  // Intake phase
  needsClarification?: boolean
  clarificationQuestion?: string
  readyToBuild?: boolean
  spec?: string
  handoffToEngineer?: boolean
  // Review phase
  reviewNeeded?: boolean
  approved?: boolean
  reasoning?: string
  corrections?: string
  concerns?: string[]
  loopDetected?: boolean
}

export type OrchestrationResult = {
  phase: 'clarification' | 'building' | 'review' | 'complete'
  architectResponse?: ArchitectResponse
  builderPlan?: BuilderResponse
  approved: boolean
  finalActions: Action[]
}

export async function orchestrate(
  claudeKey: string,
  geminiKey: string,
  directorIntent: string,
  fileTree: string[],
  previousErrors?: string[]
): Promise<OrchestrationResult> {
  const context = `
Current file tree:
${fileTree.map(f => `- ${f}`).join('\n')}

${previousErrors?.length ? `Previous errors to avoid:\n${previousErrors.join('\n')}` : ''}
`.trim()

  // PHASE 1: Architect assesses the request first (INTAKE)
  const architectAssessment = await callGemini(
    geminiKey,
    ARCHITECT_INTAKE_PROMPT,
    `Director's request: "${directorIntent}"`,
    context
  )

  let architectResponse: ArchitectResponse
  try {
    const cleaned = architectAssessment.replace(/```json\n?|\n?```/g, '').trim()
    architectResponse = JSON.parse(cleaned)
  } catch {
    // If parsing fails, assume ready to build
    architectResponse = {
      needsClarification: false,
      readyToBuild: true,
      handoffToEngineer: true,
      reviewNeeded: false
    }
  }

  // If Architect needs clarification, stop here — Engineer stays IDLE
  if (architectResponse.needsClarification) {
    return {
      phase: 'clarification',
      architectResponse,
      approved: false,
      finalActions: []
    }
  }

  // PHASE 2: Hand off to Engineering Lead if ready to build
  if (architectResponse.handoffToEngineer && architectResponse.readyToBuild) {
    const engineerPrompt = architectResponse.spec 
      ? `Architect's spec:\n${architectResponse.spec}\n\nDirector's original request: "${directorIntent}"`
      : directorIntent

    const builderRaw = await callClaude(
      claudeKey,
      BUILDER_SYSTEM_PROMPT,
      engineerPrompt,
      context
    )

    let builderPlan: BuilderResponse
    try {
      const cleaned = builderRaw.replace(/```json\n?|\n?```/g, '').trim()
      builderPlan = JSON.parse(cleaned)
    } catch {
      builderPlan = {
        thinking: 'Failed to parse response',
        actions: [],
        response: builderRaw
      }
    }

    // PHASE 3: Architect reviews ONLY if there are actions to review
    if (builderPlan.actions && builderPlan.actions.length > 0) {
      const reviewPrompt = `
Director's intent: "${directorIntent}"

Engineering Lead's plan:
${JSON.stringify(builderPlan, null, 2)}

Should this be approved for execution?
`.trim()

      const reviewRaw = await callGemini(
        geminiKey,
        ARCHITECT_REVIEW_PROMPT,
        reviewPrompt,
        context
      )

      let reviewResponse: ArchitectResponse
      try {
        const cleaned = reviewRaw.replace(/```json\n?|\n?```/g, '').trim()
        reviewResponse = JSON.parse(cleaned)
      } catch {
        // If parsing fails, auto-approve
        reviewResponse = {
          reviewNeeded: true,
          approved: true,
          reasoning: 'Auto-approved (parse error)'
        }
      }

      // If review not needed, skip the review message
      if (reviewResponse.reviewNeeded === false) {
        return {
          phase: 'complete',
          builderPlan,
          approved: true,
          finalActions: builderPlan.actions
        }
      }

      return {
        phase: 'complete',
        architectResponse: reviewResponse,
        builderPlan,
        approved: reviewResponse.approved ?? true,
        finalActions: reviewResponse.approved ? builderPlan.actions : []
      }
    }

    // No actions to review — just return builder response without architect review
    return {
      phase: 'building',
      builderPlan,
      approved: true,
      finalActions: []
    }
  }

  // Fallback
  return {
    phase: 'clarification',
    architectResponse,
    approved: false,
    finalActions: []
  }
}
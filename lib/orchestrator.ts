import { callClaude, BUILDER_SYSTEM_PROMPT } from './claude'
import { callGemini, SUPERVISOR_SYSTEM_PROMPT } from './gemini'

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

export type SupervisorResponse = {
  approved: boolean
  reasoning: string
  corrections?: string
  concerns: string[]
  loopDetected?: boolean
}

export type OrchestrationResult = {
  builderPlan: BuilderResponse
  supervisorReview: SupervisorResponse
  approved: boolean
  finalActions: Action[]
}

export async function orchestrate(
  claudeKey: string,
  geminiKey: string,
  userIntent: string,
  fileTree: string[],
  previousErrors?: string[]
): Promise<OrchestrationResult> {
  const context = `
Current file tree:
${fileTree.map(f => `- ${f}`).join('\n')}

${previousErrors?.length ? `Previous errors to avoid:\n${previousErrors.join('\n')}` : ''}
`.trim()

  // Step 1: Builder generates plan
  const builderRaw = await callClaude(
    claudeKey,
    BUILDER_SYSTEM_PROMPT,
    userIntent,
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

  // Step 2: Supervisor reviews plan
  const reviewPrompt = `
Director's intent: "${userIntent}"

Builder's plan:
${JSON.stringify(builderPlan, null, 2)}

Review this plan. Is it safe to execute?
`.trim()

  const supervisorRaw = await callGemini(
    geminiKey,
    SUPERVISOR_SYSTEM_PROMPT,
    reviewPrompt,
    context
  )

  let supervisorReview: SupervisorResponse
  try {
    const cleaned = supervisorRaw.replace(/```json\n?|\n?```/g, '').trim()
    supervisorReview = JSON.parse(cleaned)
  } catch {
    supervisorReview = {
      approved: true,
      reasoning: 'Failed to parse review, defaulting to approved',
      concerns: []
    }
  }

  return {
    builderPlan,
    supervisorReview,
    approved: supervisorReview.approved,
    finalActions: supervisorReview.approved ? builderPlan.actions : []
  }
}
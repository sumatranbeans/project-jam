import { GoogleGenerativeAI } from '@google/generative-ai'

export const ARCHITECT_INTAKE_PROMPT = `You are the Product Architect (Gemini 3 Pro).

HANDSHAKE:
- You receive the Director's intent first
- Synthesize, comprehend, and clarify if needed
- Hand off to the Engineering Lead with a blueprint when technical work is required
- If the input is casual or unclear, respond to clarify — the Engineer stays idle

Respond naturally. Use your full intelligence.`

export const ARCHITECT_REVIEW_PROMPT = `You are the Product Architect reviewing the Engineering Lead's work.

HANDSHAKE:
- Review the proposed plan against the Director's intent
- Approve if it meets the goal
- Veto only for real problems (security, wrong approach, misunderstood intent)
- If there's nothing substantive to review, say so

Respond with JSON:
{
  "approved": true/false,
  "reasoning": "your assessment",
  "concerns": []
}

Use your full intelligence. Don't rubber-stamp, but don't nitpick.`

export const SUPERVISOR_SYSTEM_PROMPT = ARCHITECT_REVIEW_PROMPT

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  message: string,
  context?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' })

  const fullMessage = context
    ? `${systemPrompt}\n\n${message}\n\nContext:\n${context}`
    : `${systemPrompt}\n\n${message}`

  const result = await model.generateContent(fullMessage)
  const response = await result.response
  return response.text()
}
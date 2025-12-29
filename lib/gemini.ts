import { GoogleGenerativeAI } from '@google/generative-ai'

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  context?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

  const fullPrompt = context 
    ? `${systemPrompt}\n\nProject context:\n${context}\n\nUser request:\n${userMessage}`
    : `${systemPrompt}\n\nUser request:\n${userMessage}`

  const result = await model.generateContent(fullPrompt)
  const response = result.response
  return response.text()
}

export const SUPERVISOR_SYSTEM_PROMPT = `You are the Supervisor in Project Jam - a Principal Architect & Quality Lead.

EXPERTISE: System design, code review, architectural patterns, security, Next.js 15, TypeScript.

PRIME DIRECTIVE: Loop Detection. If the Builder repeats the same error twice, you MUST VETO and provide a strategic pivot. You are the defender against catastrophic development debt.

Your responsibilities:
- Review the Builder's proposed actions
- Ensure architectural integrity
- Veto dangerous or incorrect implementations
- Advocate for the Director's actual intent

DECISION CRITERIA:
- APPROVE at 95% accuracy — don't block with stylistic nitpicks
- VETO only for: security issues, repeated errors, misunderstood intent
- Focus on Design Decisions that stand the test of time
- Minor concerns go in "concerns" array, not a VETO

RESPONSE FORMAT: ONLY valid JSON, no markdown.
{
  "approved": true/false,
  "reasoning": "One sentence explaining decision",
  "corrections": "If vetoed, specific strategic pivot for Builder",
  "concerns": ["Minor notes even if approved"],
  "loopDetected": false
}

You are the last line of defense. Approve good work. Block catastrophic debt.`
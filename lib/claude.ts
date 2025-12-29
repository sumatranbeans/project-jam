import Anthropic from '@anthropic-ai/sdk'

export const BUILDER_SYSTEM_PROMPT = `You are the Engineering Lead (Claude Opus 4.5).

HANDSHAKE:
- You receive work from the Product Architect
- Build with full autonomy
- Respond with JSON actions for the system to execute
- Set requestReview: true for high-risk changes (deletions, major refactors)

Action format:
{
  "actions": [
    { "type": "createFile", "path": "path", "content": "content" },
    { "type": "runCommand", "command": "command" },
    { "type": "createRepo", "name": "repo-name" },
    { "type": "commit", "message": "message" }
  ],
  "requestReview": false,
  "response": "summary for the Director"
}

Use your full intelligence. Ship quality code.`

export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  message: string,
  context?: string
): Promise<string> {
  const client = new Anthropic({ apiKey })

  const fullMessage = context 
    ? `${message}\n\nContext:\n${context}`
    : message

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content: fullMessage }]
  })

  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock ? textBlock.text : ''
}
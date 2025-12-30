// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'

export const BUILDER_SYSTEM_PROMPT = `You are the Engineering Lead. You receive blueprints from the Product Architect and create implementation plans.

OUTPUT FORMAT: Return ONLY valid JSON, no markdown, no explanation:
{
  "actions": [
    {"type": "runCommand", "command": "npm create vite@latest my-app -- --template react"},
    {"type": "runCommand", "command": "cd my-app && npm install"},
    {"type": "createFile", "path": "my-app/src/App.jsx", "content": "..."},
    {"type": "runCommand", "command": "cd my-app && npm run dev", "port": 5173}
  ],
  "response": "Brief summary of what will be built"
}

RULES:
1. Output ONLY the JSON object - no text before or after
2. For dev servers, include "port" in the action
3. NEVER mention localhost - use the preview URL from environment context
4. Keep "response" under 50 words
5. Create files with full paths relative to workspace root`

export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  context?: string
): Promise<string> {
  const client = new Anthropic({ apiKey })
  
  const fullMessage = context 
    ? `${context}\n\n---\n\n${userMessage}`
    : userMessage

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: fullMessage }]
  })

  const textBlock = response.content.find(b => b.type === 'text')
  return textBlock?.text || ''
}
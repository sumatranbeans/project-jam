import Anthropic from '@anthropic-ai/sdk'

export async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  context?: string
): Promise<string> {
  const client = new Anthropic({ apiKey })

  const messages: Anthropic.MessageParam[] = []
  
  if (context) {
    messages.push({ role: 'user', content: `Project context:\n${context}` })
    messages.push({ role: 'assistant', content: 'I understand the project context. Ready to help.' })
  }
  
  messages.push({ role: 'user', content: userMessage })

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock ? textBlock.text : ''
}

export const BUILDER_SYSTEM_PROMPT = `You are the Builder in Project Jam - a Senior Software Engineer.

EXPERTISE: Next.js 15, TypeScript, E2B sandboxes, React, Node.js, Git.

PRIME DIRECTIVE: Before creating any new file or function, scan the current file tree and repository context. You are FORBIDDEN from duplicating logic. If a utility or function exists elsewhere, reuse it or refactor it.

Your responsibilities:
- Write clean, production-ready code
- Execute terminal commands in E2B
- Create and modify files
- Fix bugs with velocity

CONSTRAINTS:
- Prioritize task outcomes over conversational filler
- Check existing files before creating new ones
- Make risk judgments quickly — bias toward action
- No duplicate logic — ever

RESPONSE FORMAT: ONLY valid JSON, no markdown.
{
  "thinking": "Brief approach (max 2 sentences)",
  "actions": [
    { "type": "createFile", "path": "src/index.ts", "content": "..." },
    { "type": "runCommand", "command": "npm install express" },
    { "type": "createRepo", "name": "my-project" },
    { "type": "commit", "message": "feat: add initial setup" }
  ],
  "response": "One-line summary for the Director"
}

Action types: createFile, runCommand, createRepo, commit

The Supervisor reviews your work. Move fast.`
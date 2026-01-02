import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

export const runtime = 'edge'

interface AgentSettings {
  verbosity: number
  creativity: number
  tension: number
  speed: number
}

interface Message {
  role: 'user' | 'claude' | 'gemini'
  content: string
}

// Build system prompt based on settings
function buildSystemPrompt(agentName: string, otherAgentName: string, settings: AgentSettings): string {
  const identity = agentName === 'Claude'
    ? `You are Claude, a sharp, logic-first thinker. You prefer structure, code, and clarity.`
    : `You are Gemini, a creative, expansive thinker. You prefer connections, metaphors, and broad context.`

  const verbosityGuide: Record<number, string> = {
    1: 'Respond in 1-2 sentences maximum. Be extremely concise.',
    2: 'Respond in 2-3 sentences. Be brief but clear.',
    3: 'Respond in 1-2 short paragraphs. Provide moderate detail.',
    4: 'Respond in full detail with examples and explanations.'
  }

  const tensionGuide: Record<number, string> = {
    1: `Be agreeable and supportive. Build on ideas with "yes, and..." approach. Find common ground with ${otherAgentName}.`,
    2: 'Mostly agree but occasionally ask clarifying questions. Be collaborative.',
    3: `Play devil's advocate sometimes. Question assumptions respectfully. Offer alternative viewpoints to ${otherAgentName}.`,
    4: `Challenge everything constructively. Push back on weak arguments. Be contrarian but respectful toward ${otherAgentName}.`
  }

  const speedGuide: Record<number, string> = {
    1: 'Take time to think through all angles. Be thorough and comprehensive.',
    2: 'Balance depth with efficiency. Cover key points.',
    3: 'Be efficient. Focus on the most important points only.',
    4: 'Be very quick and direct. Skip pleasantries. Get to the point immediately.'
  }

  return `${identity}

You are speaking in a shared lounge with ${otherAgentName} and a human Director.
You have your own perspective and opinions. You engage directly with what others say.

IMPORTANT: Start your response with a brief thought in brackets, like:
[Thinking: your brief internal thought here...]
Then provide your full response. Keep the bracketed thought under 10 words.
Example: [Thinking: weighing simplicity vs flexibility...]

CONVERSATION STYLE:
${verbosityGuide[settings.verbosity] || verbosityGuide[2]}

SOCIAL DYNAMICS:
${tensionGuide[settings.tension] || tensionGuide[2]}

PACING:
${speedGuide[settings.speed] || speedGuide[2]}

RULES:
- Engage naturally with both the user AND ${otherAgentName}
- Reference what ${otherAgentName} said when relevant ("I agree with ${otherAgentName} that..." or "Building on that point...")
- Ask ${otherAgentName} direct questions sometimes
- Don't be robotic or formal ("As per your request..." ❌)
- Don't be sycophantic ("What a great question!" ❌)
- Be yourself - have opinions, express uncertainty when genuine
- If you disagree, explain why respectfully

Remember: This is a conversation, not a presentation. Engage, don't lecture.`
}

function formatHistory(messages: Message[]): string {
  if (messages.length === 0) return ''
  return messages.map(msg => {
    if (msg.role === 'user') return `Director: ${msg.content}`
    if (msg.role === 'claude') return `Claude: ${msg.content}`
    if (msg.role === 'gemini') return `Gemini: ${msg.content}`
    return ''
  }).join('\n\n')
}

function getMaxTokens(speed: number): number {
  const map: Record<number, number> = { 1: 1024, 2: 512, 3: 256, 4: 128 }
  return map[speed] || 512
}

function parseThinking(text: string): { thinking: string; content: string } {
  const match = text.match(/^\[Thinking:\s*(.+?)\]\s*/i)
  if (match) {
    return {
      thinking: match[1],
      content: text.slice(match[0].length).trim()
    }
  }
  return { thinking: '', content: text }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const keys = await getApiKeys(userId)
    if (!keys.anthropic || !keys.google) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), { status: 400 })
    }

    const { messages, agents } = await request.json()
    const claudeSettings: AgentSettings = agents.claude
    const geminiSettings: AgentSettings = agents.gemini

    const history = formatHistory(messages.slice(0, -1))
    const latestMessage = messages[messages.length - 1]

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // === CLAUDE'S TURN ===
          send({ agent: 'claude', type: 'thinking', content: 'analyzing the question...' })

          const claudePrompt = history
            ? `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Claude:`
            : `Director: ${latestMessage.content}\n\nRespond as Claude:`

          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': keys.anthropic,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: getMaxTokens(claudeSettings.speed),
              temperature: claudeSettings.creativity,
              system: buildSystemPrompt('Claude', 'Gemini', claudeSettings),
              messages: [{ role: 'user', content: claudePrompt }]
            })
          })

          const claudeData = await claudeResponse.json()
          const claudeText = claudeData.content?.[0]?.text || 'I had trouble formulating a response.'
          const claudeTokens = {
            in: claudeData.usage?.input_tokens || 0,
            out: claudeData.usage?.output_tokens || 0
          }

          const { thinking: claudeThinking, content: claudeContent } = parseThinking(claudeText)

          if (claudeThinking) {
            send({ agent: 'claude', type: 'thinking', content: claudeThinking })
            await new Promise(r => setTimeout(r, 800)) // Let thinking display
          }

          send({
            agent: 'claude',
            type: 'complete',
            content: claudeContent,
            thinking: claudeThinking,
            tokens: claudeTokens
          })

          // === GEMINI'S TURN ===
          send({ agent: 'gemini', type: 'thinking', content: 'considering Claude\'s point...' })

          const geminiHistory = history
            ? `${history}\n\nDirector: ${latestMessage.content}\n\nClaude: ${claudeContent}`
            : `Director: ${latestMessage.content}\n\nClaude: ${claudeContent}`

          const geminiPrompt = `${geminiHistory}\n\nNow respond as Gemini, engaging with both the Director's question and Claude's response:`

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keys.google}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [{ text: `${buildSystemPrompt('Gemini', 'Claude', geminiSettings)}\n\n${geminiPrompt}` }]
                }],
                generationConfig: {
                  temperature: geminiSettings.creativity,
                  maxOutputTokens: getMaxTokens(geminiSettings.speed)
                }
              })
            }
          )

          const geminiData = await geminiResponse.json()
          const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'I had trouble formulating a response.'
          const geminiTokensOut = Math.ceil(geminiText.length / 4) // Estimate
          const geminiTokens = { in: 0, out: geminiTokensOut }

          const { thinking: geminiThinking, content: geminiContent } = parseThinking(geminiText)

          if (geminiThinking) {
            send({ agent: 'gemini', type: 'thinking', content: geminiThinking })
            await new Promise(r => setTimeout(r, 800))
          }

          send({
            agent: 'gemini',
            type: 'complete',
            content: geminiContent,
            thinking: geminiThinking,
            tokens: geminiTokens
          })

        } catch (error) {
          console.error('Streaming error:', error)
          send({ type: 'error', content: 'An error occurred during the conversation.' })
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    console.error('Lounge chat error:', error)
    return new Response(JSON.stringify({ error: 'Failed to process chat' }), { status: 500 })
  }
}
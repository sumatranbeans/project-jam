import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

export const runtime = 'edge'

interface AgentSettings {
  verbosity: number
  creativity: number
  tension: number
  speed: number
}

function buildSystemPrompt(agentName: string, otherAgentName: string, settings: AgentSettings): string {
  const identity = agentName === 'Claude'
    ? `You are Claude, a sharp, logic-first thinker. You prefer structure, precision, and clarity.`
    : `You are Gemini, a creative, expansive thinker. You prefer connections, metaphors, and broad context.`

  const verbosity: Record<number, string> = {
    1: 'Be very brief. 1-2 sentences max.',
    2: 'Be moderate. 2-4 sentences.',
    3: 'Be thorough. A short paragraph.'
  }

  const creativity: Record<number, string> = {
    1: 'Stick to facts and established knowledge.',
    2: 'Balance facts with some creative insight.',
    3: 'Be creative and exploratory in your thinking.'
  }

  const tension: Record<number, string> = {
    1: `Be agreeable. Build on ${otherAgentName}'s points supportively.`,
    2: `Be balanced. Agree when warranted, question when needed.`,
    3: `Be challenging. Push back on ${otherAgentName}'s points constructively.`
  }

  const speed: Record<number, string> = {
    1: 'Take time to explore all angles.',
    2: 'Be efficient but thorough.',
    3: 'Be quick and direct.'
  }

  return `${identity}

You're in a conversation lounge with ${otherAgentName} and a human Director.

STYLE:
- ${verbosity[settings.verbosity] || verbosity[2]}
- ${creativity[settings.creativity] || creativity[2]}
- ${tension[settings.tension] || tension[2]}
- ${speed[settings.speed] || speed[2]}

Start with a brief thought in brackets: [Thinking: brief thought...]

RULES:
- Engage naturally with both the Director and ${otherAgentName}
- Reference ${otherAgentName}'s points when relevant
- No robotic language ("As per your request...")
- No sycophancy ("Great question!")
- Have genuine opinions
- Keep responses concise`
}

function getMaxTokens(speed: number): number {
  return { 1: 800, 2: 400, 3: 200 }[speed] || 400
}

function parseThinking(text: string): { thinking: string; content: string } {
  const match = text.match(/^\[Thinking:\s*(.+?)\]\s*/i)
  if (match) return { thinking: match[1], content: text.slice(match[0].length).trim() }
  return { thinking: '', content: text }
}

// Generate scribe summary
function generateScribeSummary(messages: { role: string; content: string }[]): string {
  if (messages.length < 3) return ''
  
  const agentMessages = messages.filter(m => m.role === 'claude' || m.role === 'gemini')
  if (agentMessages.length < 2) return ''
  
  return `**Topic:** ${messages[0]?.content?.slice(0, 50)}...\n\n**Key Points:**\n- ${agentMessages.length} agent responses\n- Discussion ongoing`
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const keys = await getApiKeys(userId)
    if (!keys.anthropic || !keys.google) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), { status: 400 })
    }

    const { messages, agents, bias = 0 } = await request.json()
    const claudeSettings: AgentSettings = agents.claude
    const geminiSettings: AgentSettings = agents.gemini

    // Format history
    const history = messages.slice(0, -1).map((m: any) => {
      if (m.role === 'user') return `Director: ${m.content}`
      if (m.role === 'claude') return `Claude: ${m.content}`
      if (m.role === 'gemini') return `Gemini: ${m.content}`
      return ''
    }).join('\n\n')
    
    const latestMessage = messages[messages.length - 1]

    // Randomize who goes first (bias affects probability)
    // bias: -1 = Claude first, 0 = random, 1 = Gemini first
    const random = Math.random()
    const claudeFirstThreshold = bias === -1 ? 0.8 : bias === 1 ? 0.2 : 0.5
    const claudeFirst = random < claudeFirstThreshold

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const firstAgent = claudeFirst ? 'claude' : 'gemini'
          const secondAgent = claudeFirst ? 'gemini' : 'claude'

          // === FIRST AGENT ===
          send({ agent: firstAgent, type: 'thinking', content: 'considering...' })

          let firstResponse: { content: string; thinking: string; tokens: { in: number; out: number } }

          if (firstAgent === 'claude') {
            const prompt = history
              ? `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Claude:`
              : `Director: ${latestMessage.content}\n\nRespond as Claude:`

            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': keys.anthropic!,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: getMaxTokens(claudeSettings.speed),
                temperature: claudeSettings.creativity === 1 ? 0.3 : claudeSettings.creativity === 2 ? 0.6 : 0.9,
                system: buildSystemPrompt('Claude', 'Gemini', claudeSettings),
                messages: [{ role: 'user', content: prompt }]
              })
            })

            const data = await response.json()
            const text = data.content?.[0]?.text || ''
            const { thinking, content } = parseThinking(text)
            firstResponse = {
              content,
              thinking,
              tokens: { in: data.usage?.input_tokens || 0, out: data.usage?.output_tokens || 0 }
            }
          } else {
            const prompt = history
              ? `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Gemini:`
              : `Director: ${latestMessage.content}\n\nRespond as Gemini:`

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keys.google!}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: `${buildSystemPrompt('Gemini', 'Claude', geminiSettings)}\n\n${prompt}` }] }],
                  generationConfig: {
                    temperature: geminiSettings.creativity === 1 ? 0.3 : geminiSettings.creativity === 2 ? 0.6 : 0.9,
                    maxOutputTokens: getMaxTokens(geminiSettings.speed)
                  }
                })
              }
            )

            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const { thinking, content } = parseThinking(text)
            // Estimate tokens for Gemini
            const inputTokens = Math.ceil(prompt.length / 4)
            const outputTokens = Math.ceil(text.length / 4)
            firstResponse = { content, thinking, tokens: { in: inputTokens, out: outputTokens } }
          }

          if (firstResponse.thinking) {
            send({ agent: firstAgent, type: 'thinking', content: firstResponse.thinking })
            await new Promise(r => setTimeout(r, 600))
          }
          send({ agent: firstAgent, type: 'complete', ...firstResponse })

          // === SECOND AGENT ===
          send({ agent: secondAgent, type: 'thinking', content: 'reflecting on that...' })

          const updatedHistory = history
            ? `${history}\n\nDirector: ${latestMessage.content}\n\n${firstAgent === 'claude' ? 'Claude' : 'Gemini'}: ${firstResponse.content}`
            : `Director: ${latestMessage.content}\n\n${firstAgent === 'claude' ? 'Claude' : 'Gemini'}: ${firstResponse.content}`

          let secondResponse: { content: string; thinking: string; tokens: { in: number; out: number } }

          if (secondAgent === 'claude') {
            const prompt = `${updatedHistory}\n\nRespond as Claude, engaging with both the Director and Gemini:`

            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': keys.anthropic!,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: getMaxTokens(claudeSettings.speed),
                temperature: claudeSettings.creativity === 1 ? 0.3 : claudeSettings.creativity === 2 ? 0.6 : 0.9,
                system: buildSystemPrompt('Claude', 'Gemini', claudeSettings),
                messages: [{ role: 'user', content: prompt }]
              })
            })

            const data = await response.json()
            const text = data.content?.[0]?.text || ''
            const { thinking, content } = parseThinking(text)
            secondResponse = {
              content,
              thinking,
              tokens: { in: data.usage?.input_tokens || 0, out: data.usage?.output_tokens || 0 }
            }
          } else {
            const prompt = `${updatedHistory}\n\nRespond as Gemini, engaging with both the Director and Claude:`

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keys.google!}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: `${buildSystemPrompt('Gemini', 'Claude', geminiSettings)}\n\n${prompt}` }] }],
                  generationConfig: {
                    temperature: geminiSettings.creativity === 1 ? 0.3 : geminiSettings.creativity === 2 ? 0.6 : 0.9,
                    maxOutputTokens: getMaxTokens(geminiSettings.speed)
                  }
                })
              }
            )

            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const { thinking, content } = parseThinking(text)
            const inputTokens = Math.ceil(prompt.length / 4)
            const outputTokens = Math.ceil(text.length / 4)
            secondResponse = { content, thinking, tokens: { in: inputTokens, out: outputTokens } }
          }

          if (secondResponse.thinking) {
            send({ agent: secondAgent, type: 'thinking', content: secondResponse.thinking })
            await new Promise(r => setTimeout(r, 600))
          }
          send({ agent: secondAgent, type: 'complete', ...secondResponse })

          // === SCRIBE NOTES ===
          const scribeSummary = generateScribeSummary([...messages, 
            { role: firstAgent, content: firstResponse.content },
            { role: secondAgent, content: secondResponse.content }
          ])
          if (scribeSummary) {
            send({ type: 'scribe', content: scribeSummary })
          }

        } catch (error) {
          console.error('Stream error:', error)
          send({ type: 'error', content: 'An error occurred.' })
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    })

  } catch (error) {
    console.error('Chat error:', error)
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 })
  }
}
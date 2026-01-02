import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

export const runtime = 'edge'

interface AgentSettings {
  verbosity: number  // 1=brief, 2=medium, 3=full
  creativity: number // 1=factual, 2=balanced, 3=creative
  tension: number    // 1=chill, 2=medium, 3=spicy
  speed: number      // 1=deep, 2=medium, 3=fast
}

interface Message {
  role: string
  content: string
}

function buildSystemPrompt(
  agentName: string, 
  otherAgentName: string, 
  settings: AgentSettings,
  otherAgentSettings: AgentSettings,
  scribeContext: string,
  isRefreshed: boolean
): string {
  const identity = agentName === 'Claude'
    ? `You are Claude (Anthropic), known for precise logical analysis and structured thinking.`
    : `You are Gemini (Google), known for creative connections and broad contextual insights.`

  // Verbosity rules
  const verbosity: Record<number, string> = {
    1: 'STRICT: Maximum 2 sentences. Be extremely concise.',
    2: 'Keep it to 3-5 sentences. Moderate detail.',
    3: 'Provide thorough explanation with examples. 1-2 paragraphs allowed.'
  }

  // Creativity/Temperature guidance
  const creativity: Record<number, string> = {
    1: 'FACTUAL MODE: Stick strictly to established facts, data, and proven information. No speculation. Cite sources when possible. Be conservative.',
    2: 'BALANCED: Mix facts with reasonable inferences. Some creative insight is okay.',
    3: 'CREATIVE MODE: Think outside the box. Offer novel perspectives, analogies, and unconventional ideas. Be imaginative and exploratory.'
  }

  // Tension - this is critical
  const tensionLevel = settings.tension
  const otherTension = otherAgentSettings.tension
  
  let tensionPrompt = ''
  if (tensionLevel === 1) {
    tensionPrompt = `CHILL MODE: Be agreeable and supportive. Build on ${otherAgentName}'s points. Say "I agree" and add supporting evidence. Be collaborative.`
  } else if (tensionLevel === 2) {
    tensionPrompt = `MEDIUM MODE: Provide DIFFERENT information than ${otherAgentName}. If they covered one angle, cover a different angle. Say "Adding to that..." or "From another perspective..." Don't repeat what they said. You can agree on conclusions but must add NEW information.`
  } else {
    tensionPrompt = `SPICY MODE: ACTIVELY DISAGREE with ${otherAgentName}. Challenge their assumptions. Play devil's advocate. Say "I'd push back on that..." or "Actually, I disagree because..." Find flaws in their reasoning. Be constructively confrontational.`
  }

  // Speed affects depth
  const speed: Record<number, string> = {
    1: 'DEEP: Take time to analyze thoroughly. Consider multiple angles.',
    2: 'MEDIUM: Balance speed with substance.',
    3: 'FAST: Quick, punchy responses. Get to the point immediately. Skip pleasantries.'
  }

  // Scribe context for refreshed agents
  const scribeSection = isRefreshed && scribeContext 
    ? `\n\nYou just rejoined this conversation fresh. Here's what the Scribe recorded:\n${scribeContext}\n\nUse this context to continue naturally.`
    : ''

  return `${identity}

You're in a multi-agent conversation with ${otherAgentName} and a human Director.
${scribeSection}

CRITICAL RULES:
1. ${verbosity[settings.verbosity]}
2. ${creativity[settings.creativity]}
3. ${tensionPrompt}
4. ${speed[settings.speed]}

FORMAT RULES:
- Use **bold** for key terms and important points
- Use tables when comparing options (use markdown table syntax)
- Use bullet points for lists
- Use \`code\` for technical terms

BEHAVIOR:
- Start with a brief [Thinking: ...] tag showing your reasoning
- Engage directly with what ${otherAgentName} said
- Don't be sycophantic ("Great question!")
- Don't use robotic phrases ("As per your request")
- Have genuine opinions
- If asked about images/files, describe what you observe`
}

function getMaxTokens(speed: number): number {
  // Fast = shorter responses
  return { 1: 1000, 2: 600, 3: 300 }[speed] || 600
}

function getTemperature(creativity: number): number {
  // Factual = low temp, Creative = high temp
  return { 1: 0.2, 2: 0.5, 3: 0.9 }[creativity] || 0.5
}

function parseThinking(text: string): { thinking: string; content: string } {
  const match = text.match(/^\[Thinking:\s*(.+?)\]\s*/i)
  if (match) return { thinking: match[1], content: text.slice(match[0].length).trim() }
  return { thinking: '', content: text }
}

// Build scribe summary using Gemini Flash
async function generateScribeSummary(
  messages: Message[], 
  googleKey: string,
  existingNotes: string
): Promise<string> {
  if (messages.length < 4) return ''
  
  const recentMessages = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n\n')
  
  const prompt = `You are a Scribe AI taking notes on a conversation between Claude, Gemini, and a human Director.

EXISTING NOTES:
${existingNotes || 'None yet.'}

RECENT CONVERSATION:
${recentMessages}

YOUR TASK:
Write a brief, intelligent summary capturing:
1. The main topic/question being discussed
2. Key points or positions from each agent
3. Any decisions or conclusions reached
4. Open questions or disagreements

Keep it under 150 words. Be concise but capture the essence.
Format: Use bullet points. Start with "**Topic:**" then "**Key Points:**"`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 300 }
        })
      }
    )
    
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (e) {
    console.error('Scribe error:', e)
    return ''
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const keys = await getApiKeys(userId)
    if (!keys.anthropic || !keys.google) {
      return new Response(JSON.stringify({ error: 'API keys not configured' }), { status: 400 })
    }

    const { messages, agents, bias = 0, scribeContext = '', refreshedAgents = {} } = await request.json()
    const claudeSettings: AgentSettings = agents.claude
    const geminiSettings: AgentSettings = agents.gemini

    // Format history
    const history = messages.slice(0, -1).map((m: Message) => {
      if (m.role === 'user') return `Director: ${m.content}`
      if (m.role === 'claude') return `Claude: ${m.content}`
      if (m.role === 'gemini') return `Gemini: ${m.content}`
      return ''
    }).join('\n\n')
    
    const latestMessage = messages[messages.length - 1]

    // Determine which agents respond based on bias
    // bias: -2 = Claude only, -1 = Claude priority, 0 = both, 1 = Gemini priority, 2 = Gemini only
    const claudeResponds = bias <= 1  // Claude responds unless bias is 2 (Gemini only)
    const geminiResponds = bias >= -1 // Gemini responds unless bias is -2 (Claude only)
    
    // Determine order (randomized with bias influence)
    const random = Math.random()
    const claudeFirstThreshold = bias === -2 ? 1 : bias === -1 ? 0.75 : bias === 0 ? 0.5 : bias === 1 ? 0.25 : 0
    const claudeFirst = random < claudeFirstThreshold

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          let firstAgentResponse = ''
          
          // Helper to call Claude
          const callClaude = async (prompt: string, isFirst: boolean) => {
            send({ agent: 'claude', type: 'thinking', content: 'analyzing...' })
            
            // Use Claude Opus 4.5 for deep mode, Sonnet for others
            const model = claudeSettings.speed === 1 ? 'claude-opus-4-5-20250101' : 'claude-sonnet-4-20250514'
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': keys.anthropic!,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model,
                max_tokens: getMaxTokens(claudeSettings.speed),
                temperature: getTemperature(claudeSettings.creativity),
                system: buildSystemPrompt('Claude', 'Gemini', claudeSettings, geminiSettings, scribeContext, refreshedAgents.claude || false),
                messages: [{ role: 'user', content: prompt }]
              })
            })

            const data = await response.json()
            const text = data.content?.[0]?.text || ''
            const { thinking, content } = parseThinking(text)
            
            if (thinking) {
              send({ agent: 'claude', type: 'thinking', content: thinking })
              await new Promise(r => setTimeout(r, 500))
            }
            
            send({
              agent: 'claude',
              type: 'complete',
              content,
              thinking,
              tokens: { in: data.usage?.input_tokens || 0, out: data.usage?.output_tokens || 0 }
            })
            
            return content
          }
          
          // Helper to call Gemini
          const callGemini = async (prompt: string, isFirst: boolean) => {
            send({ agent: 'gemini', type: 'thinking', content: 'considering...' })
            
            // Use Gemini Pro for deep mode, Flash for fast
            const model = geminiSettings.speed === 3 ? 'gemini-2.0-flash' : 'gemini-2.0-flash'
            
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.google!}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    role: 'user',
                    parts: [{ text: `${buildSystemPrompt('Gemini', 'Claude', geminiSettings, claudeSettings, scribeContext, refreshedAgents.gemini || false)}\n\n${prompt}` }]
                  }],
                  generationConfig: {
                    temperature: getTemperature(geminiSettings.creativity),
                    maxOutputTokens: getMaxTokens(geminiSettings.speed)
                  }
                })
              }
            )

            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
            const { thinking, content } = parseThinking(text)
            
            // Estimate tokens
            const inputTokens = Math.ceil(prompt.length / 4)
            const outputTokens = Math.ceil(text.length / 4)
            
            if (thinking) {
              send({ agent: 'gemini', type: 'thinking', content: thinking })
              await new Promise(r => setTimeout(r, 500))
            }
            
            send({
              agent: 'gemini',
              type: 'complete',
              content,
              thinking,
              tokens: { in: inputTokens, out: outputTokens }
            })
            
            return content
          }

          // Execute based on order and bias
          if (claudeFirst) {
            if (claudeResponds) {
              const prompt = history
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Claude:`
                : `Director: ${latestMessage.content}\n\nRespond as Claude:`
              firstAgentResponse = await callClaude(prompt, true)
            }
            
            if (geminiResponds) {
              const prompt = firstAgentResponse
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nClaude: ${firstAgentResponse}\n\nRespond as Gemini, engaging with both the Director and Claude:`
                : `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Gemini:`
              await callGemini(prompt, !claudeResponds)
            }
          } else {
            if (geminiResponds) {
              const prompt = history
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Gemini:`
                : `Director: ${latestMessage.content}\n\nRespond as Gemini:`
              firstAgentResponse = await callGemini(prompt, true)
            }
            
            if (claudeResponds) {
              const prompt = firstAgentResponse
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nGemini: ${firstAgentResponse}\n\nRespond as Claude, engaging with both the Director and Gemini:`
                : `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Claude:`
              await callClaude(prompt, !geminiResponds)
            }
          }

          // Generate scribe notes periodically (every 4+ messages)
          if (messages.length >= 4 && messages.length % 4 === 0) {
            const scribeNotes = await generateScribeSummary(messages, keys.google!, scribeContext)
            if (scribeNotes) {
              send({ type: 'scribe', content: scribeNotes })
            }
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
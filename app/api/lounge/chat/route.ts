import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

export const runtime = 'edge'

// Pricing per 1M tokens
const PRICING = {
  'claude-opus-4-5-20250101': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'gemini-2.5-pro-preview-06-05': { input: 1.25, output: 5.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 }
}

interface AgentSettings {
  verbosity: number
  creativity: number
  tension: number
  speed: number
}

interface Message {
  role: string
  content: string
}

function buildClaudeSystemPrompt(
  settings: AgentSettings,
  geminiSettings: AgentSettings,
  scribeContext: string,
  isRefreshed: boolean
): string {
  const verbosity: Record<number, string> = {
    1: 'Be very concise. Maximum 2-3 sentences.',
    2: 'Be moderate. 4-6 sentences with key details.',
    3: 'Be thorough. Provide comprehensive explanation with examples.'
  }

  const tension: Record<number, string> = {
    1: 'CHILL: You and Gemini are aligned. Confirm agreement briefly, then add ONE small supporting point.',
    2: 'MEDIUM: Provide DIFFERENT perspectives than Gemini. Cover different angles. Say "Adding another angle..." or "From a different perspective...".',
    3: 'SPICY: Challenge Gemini\'s points constructively. Find weaknesses. Say "I\'d push back on..." or "That overlooks...".'
  }

  const scribeSection = isRefreshed && scribeContext 
    ? `\n\nYou just rejoined fresh. Scribe notes:\n${scribeContext}\n\nContinue naturally from this context.`
    : ''

  return `You are Claude (Anthropic). You're in a conversation with Gemini and a human Director.
${scribeSection}

RULES:
1. ${verbosity[settings.verbosity]}
2. ${tension[settings.tension]}
3. Start with [Thinking: brief thought]
4. Use **bold** for key terms
5. No sycophancy, have genuine opinions
6. Always provide substantive, helpful responses`
}

function buildGeminiSystemPrompt(
  settings: AgentSettings,
  claudeSettings: AgentSettings,
  scribeContext: string,
  isRefreshed: boolean
): string {
  const verbosity: Record<number, string> = {
    1: 'Be very concise. Maximum 2-3 sentences.',
    2: 'Be moderate. 4-6 sentences with key details.',
    3: 'Be thorough. Provide comprehensive explanation with examples.'
  }

  const tension: Record<number, string> = {
    1: 'CHILL: You and Claude are aligned. Confirm agreement briefly, add ONE supporting point.',
    2: 'MEDIUM: Provide DIFFERENT perspectives than Claude. Cover different angles.',
    3: 'SPICY: Challenge Claude\'s points constructively. Find weaknesses in their argument.'
  }

  const scribeSection = isRefreshed && scribeContext 
    ? `\n\nYou just rejoined fresh. Scribe notes:\n${scribeContext}\n\nContinue naturally from this context.`
    : ''

  return `You are Gemini (Google). You're in a conversation with Claude and a human Director.
${scribeSection}

RULES:
1. ${verbosity[settings.verbosity]}
2. ${tension[settings.tension]}
3. Start with [Thinking: brief thought]
4. Use **bold** for key terms (double asterisks only)
5. No sycophancy, have genuine opinions
6. Always provide substantive, helpful responses
7. Do NOT use backslashes or weird formatting`
}

function getMaxTokens(speed: number, verbosity: number): number {
  const base = { 1: 1200, 2: 800, 3: 400 }[speed] || 800
  const multiplier = { 1: 0.6, 2: 1, 3: 1.4 }[verbosity] || 1
  return Math.round(base * multiplier)
}

function getTemperature(creativity: number): number {
  return { 1: 0.5, 2: 0.9, 3: 1.4 }[creativity] || 0.9
}

function parseThinking(text: string): { thinking: string; content: string } {
  const match = text.match(/^\[Thinking:\s*(.+?)\]\s*/i)
  if (match) return { thinking: match[1], content: text.slice(match[0].length).trim() }
  return { thinking: '', content: text }
}

function cleanGeminiResponse(text: string): string {
  return text
    .replace(/\\([*_`#])/g, '$1')
    .replace(/\s\*([^*\n]+)\*\s/g, ' **$1** ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model as keyof typeof PRICING]
  if (!pricing) return 0
  return (inputTokens / 1_000_000 * pricing.input) + (outputTokens / 1_000_000 * pricing.output)
}

async function generateScribeSummary(
  messages: Message[], 
  googleKey: string,
  existingNotes: string
): Promise<string> {
  if (messages.length < 4) return ''
  
  const recentMessages = messages.slice(-8).map(m => `${m.role}: ${m.content.slice(0, 500)}`).join('\n\n')
  
  const prompt = `You are a Scribe AI taking notes on a conversation.

EXISTING NOTES:
${existingNotes || 'None yet.'}

RECENT CONVERSATION:
${recentMessages}

Write a concise summary (under 100 words) capturing main topic, key points from each agent, and any conclusions. Use **bold** headers.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 200 }
        })
      }
    )
    
    const data = await response.json()
    return cleanGeminiResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
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

    const history = messages.slice(0, -1).map((m: Message) => {
      if (m.role === 'user') return `Director: ${m.content}`
      if (m.role === 'claude') return `Claude: ${m.content}`
      if (m.role === 'gemini') return `Gemini: ${m.content}`
      return ''
    }).filter(Boolean).join('\n\n')
    
    const latestMessage = messages[messages.length - 1]

    // Priority logic: -2 = Claude only, 2 = Gemini only
    const claudeResponds = bias <= 1
    const geminiResponds = bias >= -1
    
    // Randomize order with bias
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
          
          const callClaude = async (prompt: string): Promise<string> => {
            send({ agent: 'claude', type: 'thinking', content: 'analyzing...' })
            
            const model = claudeSettings.speed === 3 
              ? 'claude-sonnet-4-20250514' 
              : 'claude-opus-4-5-20250101'
            
            const modelDisplay = claudeSettings.speed === 3 ? 'Sonnet 4' : 'Opus 4.5'
            
            try {
              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': keys.anthropic!,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model,
                  max_tokens: getMaxTokens(claudeSettings.speed, claudeSettings.verbosity),
                  temperature: getTemperature(claudeSettings.creativity),
                  system: buildClaudeSystemPrompt(claudeSettings, geminiSettings, scribeContext, refreshedAgents.claude || false),
                  messages: [{ role: 'user', content: prompt }]
                })
              })

              const data = await response.json()
              
              if (data.error) {
                console.error('Claude API error:', data.error)
                send({ agent: 'claude', type: 'complete', content: 'Sorry, I encountered an error.', model: modelDisplay, tokens: { in: 0, out: 0 }, cost: 0 })
                return ''
              }
              
              const text = data.content?.[0]?.text || ''
              const { thinking, content } = parseThinking(text)
              
              const inputTokens = data.usage?.input_tokens || 0
              const outputTokens = data.usage?.output_tokens || 0
              const cost = calculateCost(model, inputTokens, outputTokens)
              
              if (thinking) {
                send({ agent: 'claude', type: 'thinking', content: thinking })
                await new Promise(r => setTimeout(r, 300))
              }
              
              send({
                agent: 'claude',
                type: 'complete',
                content: content || 'I apologize, but I couldn\'t generate a response.',
                thinking,
                model: modelDisplay,
                modelId: model,
                tokens: { in: inputTokens, out: outputTokens },
                cost
              })
              
              return content
            } catch (e) {
              console.error('Claude call failed:', e)
              send({ agent: 'claude', type: 'complete', content: 'Sorry, I encountered an error.', model: modelDisplay, tokens: { in: 0, out: 0 }, cost: 0 })
              return ''
            }
          }
          
          const callGemini = async (prompt: string): Promise<string> => {
            send({ agent: 'gemini', type: 'thinking', content: 'considering...' })
            
            // Use actual available models
            const model = geminiSettings.speed === 3 
              ? 'gemini-2.0-flash'
              : 'gemini-2.5-pro-preview-06-05'
            
            const modelDisplay = geminiSettings.speed === 3 ? 'Flash 2.0' : 'Pro 2.5'
            
            const systemPrompt = buildGeminiSystemPrompt(geminiSettings, claudeSettings, scribeContext, refreshedAgents.gemini || false)
            
            try {
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.google!}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{
                      role: 'user',
                      parts: [{ text: `${systemPrompt}\n\n---\n\n${prompt}` }]
                    }],
                    generationConfig: {
                      temperature: getTemperature(geminiSettings.creativity),
                      maxOutputTokens: getMaxTokens(geminiSettings.speed, geminiSettings.verbosity)
                    }
                  })
                }
              )

              const data = await response.json()
              
              if (data.error) {
                console.error('Gemini API error:', data.error)
                send({ agent: 'gemini', type: 'complete', content: 'Sorry, I encountered an error.', model: modelDisplay, tokens: { in: 0, out: 0 }, cost: 0 })
                return ''
              }
              
              const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
              const cleanedText = cleanGeminiResponse(rawText)
              const { thinking, content } = parseThinking(cleanedText)
              
              const inputTokens = data.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4)
              const outputTokens = data.usageMetadata?.candidatesTokenCount || Math.ceil(cleanedText.length / 4)
              const cost = calculateCost(model, inputTokens, outputTokens)
              
              if (thinking) {
                send({ agent: 'gemini', type: 'thinking', content: thinking })
                await new Promise(r => setTimeout(r, 300))
              }
              
              send({
                agent: 'gemini',
                type: 'complete',
                content: content || 'I apologize, but I couldn\'t generate a response.',
                thinking,
                model: modelDisplay,
                modelId: model,
                tokens: { in: inputTokens, out: outputTokens },
                cost
              })
              
              return content
            } catch (e) {
              console.error('Gemini call failed:', e)
              send({ agent: 'gemini', type: 'complete', content: 'Sorry, I encountered an error.', model: modelDisplay, tokens: { in: 0, out: 0 }, cost: 0 })
              return ''
            }
          }

          // Execute agents
          if (claudeFirst) {
            if (claudeResponds) {
              const prompt = history
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Claude:`
                : `Director: ${latestMessage.content}\n\nRespond as Claude:`
              firstAgentResponse = await callClaude(prompt)
            }
            
            if (geminiResponds) {
              const prompt = firstAgentResponse
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nClaude: ${firstAgentResponse}\n\nRespond as Gemini, engaging with both Director and Claude:`
                : `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Gemini:`
              await callGemini(prompt)
            }
          } else {
            if (geminiResponds) {
              const prompt = history
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Gemini:`
                : `Director: ${latestMessage.content}\n\nRespond as Gemini:`
              firstAgentResponse = await callGemini(prompt)
            }
            
            if (claudeResponds) {
              const prompt = firstAgentResponse
                ? `${history}\n\nDirector: ${latestMessage.content}\n\nGemini: ${firstAgentResponse}\n\nRespond as Claude, engaging with both Director and Gemini:`
                : `${history}\n\nDirector: ${latestMessage.content}\n\nRespond as Claude:`
              await callClaude(prompt)
            }
          }

          // Scribe every 4 messages
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
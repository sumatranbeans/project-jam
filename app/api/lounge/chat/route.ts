import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'
import { 
  getActiveClaudeModel, 
  getActiveGeminiModel, 
  getScribeModel,
  calculateCost
} from '@/lib/models'

export const runtime = 'edge'

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

interface Attachment {
  type: 'image' | 'file'
  name: string
  base64?: string
  mimeType?: string
}

function buildClaudeSystemPrompt(
  settings: AgentSettings,
  geminiSettings: AgentSettings,
  scribeContext: string,
  isRefreshed: boolean
): string {
  const scribeSection = isRefreshed && scribeContext 
    ? `\n\nContext from previous conversation:\n${scribeContext}`
    : ''

  // Minimal prompt - just context about the conversation setup
  return `You are Claude in a multi-agent conversation with Gemini and a human user.${scribeSection}

Respond naturally to their questions.`
}

function buildGeminiSystemPrompt(
  settings: AgentSettings,
  claudeSettings: AgentSettings,
  scribeContext: string,
  isRefreshed: boolean
): string {
  const scribeSection = isRefreshed && scribeContext 
    ? `\n\nContext from previous conversation:\n${scribeContext}`
    : ''

  // Minimal prompt - just context about the conversation setup
  return `You are Gemini in a multi-agent conversation with Claude and a human user.${scribeSection}

Respond naturally to their questions.`
}

function getMaxTokens(speed: number, verbosity: number): number {
  const base = { 1: 1200, 2: 800, 3: 400 }[speed] || 800
  const multiplier = { 1: 0.6, 2: 1, 3: 1.4 }[verbosity] || 1
  return Math.round(base * multiplier)
}

function getTemperature(creativity: number): number {
  return { 1: 0.5, 2: 0.9, 3: 1.4 }[creativity] || 0.9
}

function cleanGeminiResponse(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, '')
    .replace(/```thinking[\s\S]*?```/gi, '')
    .replace(/\\([*_`#])/g, '$1')
    .replace(/\s\*([^*\n]+)\*\s/g, ' **$1** ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

// Build Claude message content with images
function buildClaudeContent(prompt: string, attachments: Attachment[]): unknown {
  if (!attachments || attachments.length === 0) {
    return prompt
  }
  
  const content: unknown[] = []
  
  // Add images first
  for (const att of attachments) {
    if (att.type === 'image' && att.base64) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: att.mimeType || 'image/jpeg',
          data: att.base64
        }
      })
    }
  }
  
  // Add text prompt
  content.push({ type: 'text', text: prompt })
  
  return content
}

// Build Gemini message parts with images
function buildGeminiParts(prompt: string, attachments: Attachment[]): unknown[] {
  const parts: unknown[] = []
  
  // Add images first
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type === 'image' && att.base64) {
        parts.push({
          inline_data: {
            mime_type: att.mimeType || 'image/jpeg',
            data: att.base64
          }
        })
      }
    }
  }
  
  // Add text prompt
  parts.push({ text: prompt })
  
  return parts
}

async function generateScribeSummary(
  messages: Message[], 
  googleKey: string,
  existingNotes: string
): Promise<string> {
  if (messages.length < 4) return ''
  
  const scribeModel = getScribeModel()
  const recentMessages = messages.slice(-8).map(m => `${m.role}: ${m.content.slice(0, 500)}`).join('\n\n')
  
  const prompt = `You are a Scribe AI taking notes on a conversation.

EXISTING NOTES:
${existingNotes || 'None yet.'}

RECENT CONVERSATION:
${recentMessages}

Write a concise summary (under 100 words) capturing main topic, key points from each agent, and any conclusions. Use **bold** headers.`

  try {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.3,
      maxOutputTokens: 200
    }
    
    if (scribeModel.apiConfig?.thinkingLevel) {
      generationConfig.thinkingConfig = { 
        thinkingLevel: scribeModel.apiConfig.thinkingLevel 
      }
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${scribeModel.id}:generateContent?key=${googleKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig
        })
      }
    )
    
    const data = await response.json()
    
    const parts = data.candidates?.[0]?.content?.parts || []
    let rawText = ''
    for (const part of parts) {
      if (part.text && !part.thought) {
        rawText += part.text
      }
    }
    
    return cleanGeminiResponse(rawText)
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

    const body = await request.json()
    const { 
      messages, 
      attachments = [], 
      agents, 
      bias = 0, 
      scribeContext = '', 
      refreshedAgents = {} 
    } = body
    
    const claudeSettings: AgentSettings = agents.claude
    const geminiSettings: AgentSettings = agents.gemini

    const history = messages.slice(0, -1).map((m: Message) => {
      if (m.role === 'user') return `User: ${m.content}`
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
          
          const callClaude = async (prompt: string, withAttachments: boolean): Promise<string> => {
            const model = getActiveClaudeModel(claudeSettings.speed)
            
            send({ agent: 'claude', type: 'thinking', content: 'analyzing...' })
            
            try {
              // Build content - include images only for the first call with attachments
              const content = withAttachments 
                ? buildClaudeContent(prompt, attachments)
                : prompt
              
              const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': keys.anthropic!,
                  'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                  model: model.id,
                  max_tokens: getMaxTokens(claudeSettings.speed, claudeSettings.verbosity),
                  temperature: getTemperature(claudeSettings.creativity),
                  system: buildClaudeSystemPrompt(claudeSettings, geminiSettings, scribeContext, refreshedAgents.claude || false),
                  messages: [{ role: 'user', content }]
                })
              })

              const data = await response.json()
              
              if (data.error) {
                console.error('Claude API error:', data.error)
                send({ agent: 'claude', type: 'complete', content: `Error: ${data.error.message || 'API error'}`, model: model.displayName, tokens: { in: 0, out: 0 }, cost: 0 })
                return ''
              }
              
              const text = data.content?.[0]?.text || ''
              
              const inputTokens = data.usage?.input_tokens || 0
              const outputTokens = data.usage?.output_tokens || 0
              const cost = calculateCost(model.id, inputTokens, outputTokens)
              
              send({
                agent: 'claude',
                type: 'complete',
                content: text || 'I encountered an issue generating a response.',
                model: model.displayName,
                modelId: model.id,
                tokens: { in: inputTokens, out: outputTokens },
                cost
              })
              
              return text
            } catch (e) {
              console.error('Claude call failed:', e)
              send({ agent: 'claude', type: 'complete', content: 'Sorry, I encountered an error.', model: model.displayName, tokens: { in: 0, out: 0 }, cost: 0 })
              return ''
            }
          }
          
          const callGemini = async (prompt: string, withAttachments: boolean): Promise<string> => {
            const model = getActiveGeminiModel(geminiSettings.speed)
            
            send({ agent: 'gemini', type: 'thinking', content: 'considering...' })
            
            const systemPrompt = buildGeminiSystemPrompt(geminiSettings, claudeSettings, scribeContext, refreshedAgents.gemini || false)
            const fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`
            
            try {
              const generationConfig: Record<string, unknown> = {
                temperature: getTemperature(geminiSettings.creativity),
                maxOutputTokens: getMaxTokens(geminiSettings.speed, geminiSettings.verbosity)
              }
              
              if (model.apiConfig?.thinkingLevel) {
                generationConfig.thinkingConfig = { 
                  thinkingLevel: model.apiConfig.thinkingLevel 
                }
              }
              
              // Build parts - include images only for the first call with attachments
              const parts = withAttachments 
                ? buildGeminiParts(fullPrompt, attachments)
                : [{ text: fullPrompt }]
              
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${keys.google!}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ role: 'user', parts }],
                    generationConfig
                  })
                }
              )

              const data = await response.json()
              
              if (data.error) {
                console.error('Gemini API error:', data.error)
                send({ agent: 'gemini', type: 'complete', content: `Error: ${data.error.message || 'API error'}`, model: model.displayName, tokens: { in: 0, out: 0 }, cost: 0 })
                return ''
              }
              
              const responseParts = data.candidates?.[0]?.content?.parts || []
              let rawText = ''
              for (const part of responseParts) {
                if (part.text && !part.thought) {
                  rawText += part.text
                }
              }
              
              if (!rawText) {
                console.error('No text in Gemini response:', JSON.stringify(data))
                send({ agent: 'gemini', type: 'complete', content: 'I encountered an issue generating a response.', model: model.displayName, tokens: { in: 0, out: 0 }, cost: 0 })
                return ''
              }
              
              const cleanedText = cleanGeminiResponse(rawText)
              
              const inputTokens = data.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4)
              const outputTokens = data.usageMetadata?.candidatesTokenCount || Math.ceil(cleanedText.length / 4)
              const cost = calculateCost(model.id, inputTokens, outputTokens)
              
              send({
                agent: 'gemini',
                type: 'complete',
                content: cleanedText,
                model: model.displayName,
                modelId: model.id,
                tokens: { in: inputTokens, out: outputTokens },
                cost
              })
              
              return cleanedText
            } catch (e) {
              console.error('Gemini call failed:', e)
              send({ agent: 'gemini', type: 'complete', content: 'Sorry, I encountered an error.', model: model.displayName, tokens: { in: 0, out: 0 }, cost: 0 })
              return ''
            }
          }

          // Determine if we have attachments to send
          const hasAttachments = attachments && attachments.length > 0

          // Execute agents
          if (claudeFirst) {
            if (claudeResponds) {
              const prompt = history
                ? `${history}\n\nUser: ${latestMessage.content}\n\nRespond as Claude:`
                : `User: ${latestMessage.content}\n\nRespond as Claude:`
              firstAgentResponse = await callClaude(prompt, hasAttachments)
            }
            
            if (geminiResponds) {
              const prompt = firstAgentResponse
                ? `${history}\n\nUser: ${latestMessage.content}\n\nClaude: ${firstAgentResponse}\n\nRespond as Gemini:`
                : `${history}\n\nUser: ${latestMessage.content}\n\nRespond as Gemini:`
              // Second agent also gets attachments if first didn't respond
              await callGemini(prompt, hasAttachments && !claudeResponds)
            }
          } else {
            if (geminiResponds) {
              const prompt = history
                ? `${history}\n\nUser: ${latestMessage.content}\n\nRespond as Gemini:`
                : `User: ${latestMessage.content}\n\nRespond as Gemini:`
              firstAgentResponse = await callGemini(prompt, hasAttachments)
            }
            
            if (claudeResponds) {
              const prompt = firstAgentResponse
                ? `${history}\n\nUser: ${latestMessage.content}\n\nGemini: ${firstAgentResponse}\n\nRespond as Claude:`
                : `${history}\n\nUser: ${latestMessage.content}\n\nRespond as Claude:`
              // Second agent also gets attachments if first didn't respond
              await callClaude(prompt, hasAttachments && !geminiResponds)
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
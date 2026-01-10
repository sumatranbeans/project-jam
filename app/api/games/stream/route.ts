import { NextRequest } from 'next/server'
import { getSession } from '@/lib/games/session-store'

export const runtime = 'nodejs'

// SSE endpoint for real-time game updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 })
  }

  const encoder = new TextEncoder()
  let lastUpdate = 0

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state
      const session = getSession(sessionId)
      if (session) {
        const data = JSON.stringify({ type: 'sync', session })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        lastUpdate = session.updatedAt
      }

      // Poll for updates every 200ms
      const interval = setInterval(() => {
        try {
          const session = getSession(sessionId)

          if (!session) {
            const data = JSON.stringify({ type: 'session-ended' })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            clearInterval(interval)
            controller.close()
            return
          }

          // Only send if there's been an update
          if (session.updatedAt > lastUpdate) {
            const data = JSON.stringify({ type: 'sync', session })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            lastUpdate = session.updatedAt
          }
        } catch (error) {
          console.error('Stream error:', error)
          clearInterval(interval)
          controller.close()
        }
      }, 200)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

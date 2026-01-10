import { NextRequest, NextResponse } from 'next/server'
import {
  createSession,
  joinSession,
  getSession,
  getSessionByCode,
  updateSession,
  removePlayer,
  startGame,
  addSubmission,
  addVote,
  updateRound
} from '@/lib/games/session-store'
import { GameType, RoundPhase } from '@/lib/games/types'
import {
  startNextRound,
  scoreCurrentRound,
  applyScores,
  isGameComplete,
  getWinner
} from '@/lib/games/engines'

export const runtime = 'nodejs'

// GET - Fetch session state
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  const code = searchParams.get('code')

  if (sessionId) {
    const session = getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    return NextResponse.json({ session })
  }

  if (code) {
    const session = getSessionByCode(code)
    if (!session) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 })
    }
    return NextResponse.json({ session })
  }

  return NextResponse.json({ error: 'Missing sessionId or code' }, { status: 400 })
}

// POST - Create or join session, or perform actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create': {
        const { hostName } = body
        if (!hostName) {
          return NextResponse.json({ error: 'Host name required' }, { status: 400 })
        }
        const result = createSession(hostName)
        return NextResponse.json(result)
      }

      case 'join': {
        const { code, playerName } = body
        if (!code || !playerName) {
          return NextResponse.json({ error: 'Code and player name required' }, { status: 400 })
        }
        const result = joinSession(code, playerName)
        if (!result) {
          return NextResponse.json({ error: 'Cannot join session' }, { status: 400 })
        }
        return NextResponse.json(result)
      }

      case 'leave': {
        const { sessionId, playerId } = body
        const session = removePlayer(sessionId, playerId)
        return NextResponse.json({ session })
      }

      case 'select-game': {
        const { sessionId, gameType } = body as { sessionId: string; gameType: GameType }
        const session = startGame(sessionId, gameType)
        if (!session) {
          return NextResponse.json({ error: 'Failed to select game' }, { status: 400 })
        }
        return NextResponse.json({ session })
      }

      case 'start-round': {
        const { sessionId } = body
        let session = getSession(sessionId)
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        session = startNextRound(session)
        if (!session) {
          return NextResponse.json({ error: 'Failed to start round' }, { status: 400 })
        }
        return NextResponse.json({ session })
      }

      case 'submit': {
        const { sessionId, playerId, content } = body
        const session = addSubmission(sessionId, playerId, content)
        if (!session) {
          return NextResponse.json({ error: 'Failed to submit' }, { status: 400 })
        }
        return NextResponse.json({ session })
      }

      case 'vote': {
        const { sessionId, playerId, vote } = body
        const session = addVote(sessionId, playerId, vote)
        if (!session) {
          return NextResponse.json({ error: 'Failed to vote' }, { status: 400 })
        }
        return NextResponse.json({ session })
      }

      case 'change-phase': {
        const { sessionId, phase } = body as { sessionId: string; phase: RoundPhase }
        const session = updateRound(sessionId, { phase })
        if (!session) {
          return NextResponse.json({ error: 'Failed to change phase' }, { status: 400 })
        }
        return NextResponse.json({ session })
      }

      case 'end-round': {
        const { sessionId } = body
        let session = getSession(sessionId)
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        // Score the round
        const scores = scoreCurrentRound(session)
        applyScores(session, scores)

        // Check if game is complete
        if (isGameComplete(session)) {
          session = updateSession(sessionId, {
            state: 'game-end',
            roundData: { ...session.roundData!, phase: 'scoring' }
          })
        } else {
          session = updateSession(sessionId, {
            state: 'round-end',
            roundData: { ...session.roundData!, phase: 'scoring' }
          })
        }

        return NextResponse.json({
          session,
          roundScores: scores,
          isComplete: isGameComplete(session!)
        })
      }

      case 'next-game': {
        const { sessionId } = body
        const session = updateSession(sessionId, {
          state: 'lobby',
          gameType: null,
          currentRound: 0,
          roundData: null
        })
        // Reset scores
        if (session) {
          session.players.forEach(p => p.score = 0)
        }
        return NextResponse.json({ session })
      }

      case 'update-settings': {
        const { sessionId, settings } = body
        const session = getSession(sessionId)
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        const updated = updateSession(sessionId, {
          settings: { ...session.settings, ...settings },
          totalRounds: settings.roundCount || session.totalRounds
        })
        return NextResponse.json({ session: updated })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

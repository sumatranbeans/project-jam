'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { GameSession, GAMES, GameType } from '@/lib/games/types'

export default function GameSelectPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    }>
      <GameSelectPage />
    </Suspense>
  )
}

function GameSelectPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('sessionId')
  const [session, setSession] = useState<GameSession | null>(null)

  // Fetch session
  useEffect(() => {
    if (!sessionId) return

    fetch(`/api/games/session?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setSession(data.session)
        }
      })
  }, [sessionId])

  // Subscribe to updates
  useEffect(() => {
    if (!sessionId) return

    const eventSource = new EventSource(`/api/games/stream?sessionId=${sessionId}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'sync') {
          setSession(data.session)
          // If game was selected, go back to main game page
          if (data.session.state === 'instructions' || data.session.state === 'playing') {
            router.push('/games')
          }
        }
      } catch (e) {
        console.error('Parse error:', e)
      }
    }

    return () => eventSource.close()
  }, [sessionId, router])

  const selectGame = async (gameType: GameType) => {
    if (!sessionId) return

    await fetch('/api/games/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'select-game',
        sessionId,
        gameType
      })
    })

    router.push('/games')
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 animate-slide-down">
            Pick a Game!
          </h1>
          <p className="text-white/80 text-xl">
            {session.players.length} players ready to play
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.filter(g => g.minPlayers <= session.players.length).map((game, i) => (
            <button
              key={game.type}
              onClick={() => selectGame(game.type)}
              className="bg-white rounded-3xl p-6 text-left hover:scale-[1.02] transition-all shadow-xl animate-slide-up group"
              style={{
                animationDelay: `${i * 100}ms`,
                borderBottom: `4px solid ${game.color}`
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="text-5xl p-4 rounded-2xl group-hover:animate-wiggle transition-transform"
                  style={{ backgroundColor: game.color + '20' }}
                >
                  {game.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800">{game.name}</h3>
                  <p className="text-gray-500">{game.tagline}</p>
                </div>
              </div>

              <p className="text-gray-600 mt-4">{game.description}</p>

              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                  👥 {game.minPlayers}-{game.maxPlayers} players
                </span>
                <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                  ⏱️ {game.duration}
                </span>
                <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                  {game.difficulty === 'easy' ? '🟢' : game.difficulty === 'medium' ? '🟡' : '🔴'} {game.difficulty}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Kids will learn:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {game.educational.map(skill => (
                    <span key={skill} className="text-xs px-2 py-0.5 bg-game-primary/10 text-game-primary rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Back button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/games')}
            className="text-white/60 hover:text-white transition-colors"
          >
            ← Back to lobby
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { GameSession, GAMES, GameType, Player } from '@/lib/games/types'

// ============================================
// TV HOST SCREEN - The main shared display
// ============================================

export default function GameHost() {
  const [session, setSession] = useState<GameSession | null>(null)
  const [hostName, setHostName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  // Subscribe to session updates
  useEffect(() => {
    if (!session?.id) return

    const eventSource = new EventSource(`/api/games/stream?sessionId=${session.id}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'sync') {
          setSession(data.session)
        } else if (data.type === 'session-ended') {
          setSession(null)
        }
      } catch (e) {
        console.error('Parse error:', e)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => eventSource.close()
  }, [session?.id])

  // Create a new game session
  const createSession = async () => {
    if (!hostName.trim()) {
      setError('Please enter your name')
      return
    }
    setIsCreating(true)
    setError('')

    try {
      const res = await fetch('/api/games/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', hostName: hostName.trim() })
      })
      const data = await res.json()
      if (data.session) {
        setSession(data.session)
        // Store session info for reconnection
        localStorage.setItem('gameSession', JSON.stringify({
          sessionId: data.session.id,
          playerId: data.playerId
        }))
      } else {
        setError(data.error || 'Failed to create session')
      }
    } catch (e) {
      setError('Connection error')
    } finally {
      setIsCreating(false)
    }
  }

  // Session action handler
  const sessionAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!session) return

    try {
      const res = await fetch('/api/games/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sessionId: session.id,
          ...payload
        })
      })
      const data = await res.json()
      if (data.session) {
        setSession(data.session)
      }
    } catch (e) {
      console.error('Action error:', e)
    }
  }

  // No session - show create screen
  if (!session) {
    return <CreateScreen
      hostName={hostName}
      setHostName={setHostName}
      onCreate={createSession}
      isCreating={isCreating}
      error={error}
    />
  }

  // Route to appropriate screen based on game state
  switch (session.state) {
    case 'lobby':
      return <LobbyScreen session={session} onAction={sessionAction} />
    case 'selecting':
      return <GameSelectScreen session={session} onAction={sessionAction} />
    case 'instructions':
      return <InstructionsScreen session={session} onAction={sessionAction} />
    case 'playing':
      return <PlayingScreen session={session} onAction={sessionAction} />
    case 'round-end':
      return <RoundEndScreen session={session} onAction={sessionAction} />
    case 'game-end':
      return <GameEndScreen session={session} onAction={sessionAction} />
    default:
      return <LobbyScreen session={session} onAction={sessionAction} />
  }
}

// ============================================
// CREATE SCREEN
// ============================================

function CreateScreen({
  hostName,
  setHostName,
  onCreate,
  isCreating,
  error
}: {
  hostName: string
  setHostName: (name: string) => void
  onCreate: () => void
  isCreating: boolean
  error: string
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary via-purple-600 to-game-secondary flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-lg w-full animate-pop">
        {/* Logo/Title */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-4">🎮</div>
          <h1 className="text-5xl font-black text-gray-800 mb-2">
            Project Jam
          </h1>
          <p className="text-gray-500 text-lg">
            Family games that bring everyone together
          </p>
        </div>

        {/* Create Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
              placeholder="Enter your name..."
              className="w-full px-6 py-4 text-xl border-2 border-gray-200 rounded-2xl focus:border-game-primary focus:outline-none transition-colors"
              maxLength={20}
            />
          </div>

          {error && (
            <p className="text-red-500 text-center animate-wiggle">{error}</p>
          )}

          <button
            onClick={onCreate}
            disabled={isCreating}
            className="w-full py-5 bg-gradient-to-r from-game-primary to-game-secondary text-white text-2xl font-bold rounded-2xl hover:opacity-90 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none shadow-lg"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin">⏳</span> Creating...
              </span>
            ) : (
              'Start a Game Night!'
            )}
          </button>
        </div>

        <p className="text-center text-gray-400 mt-8 text-sm">
          Players will join with their phones
        </p>
      </div>
    </div>
  )
}

// ============================================
// LOBBY SCREEN - Waiting for players
// ============================================

function LobbyScreen({
  session,
  onAction
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
}) {
  const canStart = session.players.length >= 2
  const [showGameSelect, setShowGameSelect] = useState(false)

  // Generate QR code URL
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/games/play?code=${session.code}`
    : ''

  // Simple QR code using a free API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(joinUrl)}`

  if (showGameSelect) {
    return <GameSelectInline session={session} onAction={onAction} onBack={() => setShowGameSelect(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header with Join Code */}
        <div className="text-center mb-8 animate-slide-down">
          <h1 className="text-4xl font-bold text-white mb-4">Join the Game!</h1>
          <div className="inline-block bg-white rounded-3xl px-12 py-8 shadow-2xl">
            <p className="text-gray-500 text-lg mb-2">Scan QR or go to:</p>
            <div className="flex items-center justify-center gap-6">
              {/* QR Code */}
              <img
                src={qrCodeUrl}
                alt="Join QR Code"
                className="w-36 h-36 rounded-xl border-4 border-gray-200"
              />
              <div>
                <p className="text-gray-400 text-sm mb-1">Enter code:</p>
                <p className="text-6xl font-black tracking-[0.2em] text-game-primary">
                  {session.code}
                </p>
                <p className="text-gray-400 mt-2 text-sm">at <span className="font-mono">/games/play</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Players Grid */}
        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Players ({session.players.length}/6)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {session.players.map((player, i) => (
              <PlayerCard key={player.id} player={player} index={i} />
            ))}
            {/* Empty slots */}
            {Array.from({ length: 6 - session.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-white/5 rounded-2xl p-6 flex flex-col items-center justify-center border-2 border-dashed border-white/20"
              >
                <div className="text-5xl opacity-30">👤</div>
                <p className="text-white/30 text-sm mt-2">Waiting...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center">
          {canStart ? (
            <button
              onClick={() => setShowGameSelect(true)}
              className="px-16 py-6 bg-white text-game-primary text-3xl font-bold rounded-full hover:scale-105 transition-transform shadow-xl animate-pulse-fast"
            >
              Choose a Game! 🎮
            </button>
          ) : (
            <div className="bg-white/20 rounded-full px-12 py-6 inline-block">
              <p className="text-white text-2xl">
                Need at least 2 players to start...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// GAME SELECT INLINE - Embedded in lobby
// ============================================

function GameSelectInline({
  session,
  onAction,
  onBack
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
  onBack: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="text-white/80 hover:text-white flex items-center gap-2"
          >
            ← Back to lobby
          </button>
          <div className="flex items-center gap-3">
            {session.players.map(p => (
              <span key={p.id} className="text-3xl">{p.avatar}</span>
            ))}
          </div>
        </div>

        <h1 className="text-5xl font-bold text-white text-center mb-8 animate-slide-down">
          Pick a Game!
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.filter(g => g.minPlayers <= session.players.length).map((game, i) => (
            <button
              key={game.type}
              onClick={() => onAction('select-game', { gameType: game.type })}
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

              <p className="text-gray-600 mt-4 text-sm">{game.description}</p>

              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                  👥 {game.minPlayers}-{game.maxPlayers} players
                </span>
                <span className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600">
                  ⏱️ {game.duration}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Learn:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {game.educational.slice(0, 2).map(skill => (
                    <span key={skill} className="text-xs px-2 py-0.5 bg-game-primary/10 text-game-primary rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// PLAYER CARD
// ============================================

function PlayerCard({ player, index }: { player: Player; index: number }) {
  const colors = [
    'from-red-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-green-400 to-emerald-500',
    'from-blue-400 to-cyan-500',
    'from-purple-400 to-violet-500',
    'from-pink-400 to-rose-500',
  ]

  return (
    <div
      className={`bg-gradient-to-br ${colors[index % colors.length]} rounded-2xl p-6 flex flex-col items-center shadow-lg animate-pop`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="text-5xl mb-2">{player.avatar}</div>
      <p className="text-white font-bold text-lg truncate max-w-full">
        {player.name}
      </p>
      {player.isHost && (
        <span className="text-xs bg-white/30 px-2 py-1 rounded-full mt-1">
          👑 Host
        </span>
      )}
    </div>
  )
}

// ============================================
// GAME SELECT SCREEN
// ============================================

function GameSelectScreen({
  session,
  onAction
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8 animate-slide-down">
          Pick a Game!
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.filter(g =>
            g.minPlayers <= session.players.length
          ).map((game, i) => (
            <button
              key={game.type}
              onClick={() => onAction('select-game', { gameType: game.type })}
              className="bg-white rounded-3xl p-6 text-left hover:scale-[1.02] transition-all shadow-xl animate-slide-up group"
              style={{
                animationDelay: `${i * 100}ms`,
                borderBottom: `4px solid ${game.color}`
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="text-5xl p-3 rounded-2xl group-hover:animate-wiggle"
                  style={{ backgroundColor: game.color + '20' }}
                >
                  {game.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{game.name}</h3>
                  <p className="text-sm text-gray-500">{game.tagline}</p>
                </div>
              </div>
              <p className="text-gray-600 mt-4 text-sm">{game.description}</p>
              <div className="flex gap-2 mt-4 flex-wrap">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {game.minPlayers}-{game.maxPlayers} players
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {game.duration}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// INSTRUCTIONS SCREEN
// ============================================

function InstructionsScreen({
  session,
  onAction
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
}) {
  const game = GAMES.find(g => g.type === session.gameType)
  if (!game) return null

  const instructions = getGameInstructions(session.gameType!)

  return (
    <div
      className="min-h-screen p-8 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` }}
    >
      <div className="bg-white rounded-3xl p-12 max-w-2xl w-full shadow-2xl animate-pop">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">{game.icon}</div>
          <h1 className="text-4xl font-bold text-gray-800">{game.name}</h1>
          <p className="text-xl text-gray-500 mt-2">{game.tagline}</p>
        </div>

        <div className="space-y-4 mb-8">
          {instructions.map((step, i) => (
            <div
              key={i}
              className="flex gap-4 items-start animate-slide-up"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: game.color }}
              >
                {i + 1}
              </div>
              <p className="text-gray-700 text-lg">{step}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => onAction('start-round')}
          className="w-full py-5 text-white text-2xl font-bold rounded-2xl hover:opacity-90 transition-all transform hover:scale-[1.02] shadow-lg"
          style={{ backgroundColor: game.color }}
        >
          Let&apos;s Play! 🎉
        </button>
      </div>
    </div>
  )
}

function getGameInstructions(gameType: GameType): string[] {
  switch (gameType) {
    case 'doodle-detective':
      return [
        'One player draws a secret word on their phone',
        'Everyone else guesses what it is!',
        'The faster you guess, the more points!',
        'Drawers score when people guess correctly'
      ]
    case 'story-stacker':
      return [
        'Each player adds one sentence to a story',
        'You only see the LAST sentence written',
        'After everyone writes, the full story is revealed!',
        'Get ready for surprises and laughs!'
      ]
    case 'emoji-telepathy':
      return [
        'Everyone sees the same prompt',
        'Pick 3 emojis that match the prompt',
        'Score points for matching other players!',
        'Think alike to win!'
      ]
    case 'bluff-master':
      return [
        'One player knows the REAL answer',
        'Everyone else makes up fake answers',
        'Vote for which answer you think is true',
        'Fool others with convincing bluffs!'
      ]
    case 'category-clash':
      return [
        'A category appears on screen',
        'Race to type an answer!',
        'Unique answers score - duplicates get nothing!',
        'Think different to win!'
      ]
    default:
      return ['Get ready to play!']
  }
}

// ============================================
// PLAYING SCREEN - Active gameplay
// ============================================

function PlayingScreen({
  session,
  onAction
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
}) {
  const game = GAMES.find(g => g.type === session.gameType)
  if (!game) return null

  // Render game-specific TV display
  return (
    <div
      className="min-h-screen p-8"
      style={{ background: `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` }}
    >
      <GameDisplay session={session} onAction={onAction} />
    </div>
  )
}

function GameDisplay({
  session,
  onAction
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
}) {
  const rd = session.roundData
  const game = GAMES.find(g => g.type === session.gameType)!
  const submissionCount = rd ? Object.keys(rd.submissions).length : 0
  const playerCount = session.players.length

  // Timer display
  const [timeLeft, setTimeLeft] = useState(rd?.timer || 0)

  useEffect(() => {
    if (!rd?.timerStarted) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - rd.timerStarted) / 1000)
      const remaining = Math.max(0, rd.timer - elapsed)
      setTimeLeft(remaining)

      if (remaining === 0) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [rd?.timerStarted, rd?.timer])

  // Check if everyone submitted
  useEffect(() => {
    if (submissionCount >= playerCount && rd?.phase === 'input') {
      // Auto-advance to reveal
      onAction('change-phase', { phase: 'reveal' })
    }
  }, [submissionCount, playerCount, rd?.phase, onAction])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="bg-white/20 backdrop-blur rounded-full px-6 py-3">
          <span className="text-white text-xl font-bold">
            Round {session.currentRound} / {session.totalRounds}
          </span>
        </div>
        <div className="text-6xl">{game.icon}</div>
        <div className="bg-white rounded-full px-6 py-3">
          <span
            className="text-3xl font-bold"
            style={{ color: timeLeft < 10 ? '#EF4444' : game.color }}
          >
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl mb-8 min-h-[300px]">
        {session.gameType === 'doodle-detective' && (
          <DoodleDisplay session={session} phase={rd?.phase || 'prompt'} />
        )}
        {session.gameType === 'story-stacker' && (
          <StoryDisplay session={session} phase={rd?.phase || 'prompt'} />
        )}
        {session.gameType === 'emoji-telepathy' && (
          <EmojiDisplay session={session} phase={rd?.phase || 'prompt'} />
        )}
        {session.gameType === 'bluff-master' && (
          <BluffDisplay session={session} phase={rd?.phase || 'prompt'} />
        )}
        {session.gameType === 'category-clash' && (
          <ClashDisplay session={session} phase={rd?.phase || 'prompt'} />
        )}
      </div>

      {/* Submission Status */}
      <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
        <div className="flex justify-center gap-3">
          {session.players.map(player => {
            const hasSubmitted = rd?.submissions[player.id]
            return (
              <div
                key={player.id}
                className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                  hasSubmitted
                    ? 'bg-game-success/20 scale-110'
                    : 'bg-white/10'
                }`}
              >
                <span className="text-3xl">{player.avatar}</span>
                <span className="text-white text-sm font-medium mt-1">
                  {player.name}
                </span>
                <span className="text-2xl mt-1">
                  {hasSubmitted ? '✅' : '⏳'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* End Round Button (for host) */}
      {rd?.phase === 'reveal' && (
        <div className="text-center mt-8">
          <button
            onClick={() => onAction('end-round')}
            className="px-12 py-4 bg-white text-gray-800 text-xl font-bold rounded-full hover:scale-105 transition-transform shadow-xl"
          >
            See Scores! 🏆
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// GAME-SPECIFIC TV DISPLAYS
// ============================================

function DoodleDisplay({ session, phase }: { session: GameSession; phase: string }) {
  const rd = session.roundData
  const drawer = session.players.find(p => p.id === rd?.activePlayerId)

  if (phase === 'prompt' || phase === 'input') {
    return (
      <div className="text-center">
        <p className="text-2xl text-gray-500 mb-4">
          {drawer?.name} is drawing...
        </p>
        <div className="text-8xl animate-wiggle">🎨</div>
        <p className="text-xl text-gray-400 mt-4">
          Everyone else: guess on your phones!
        </p>
      </div>
    )
  }

  // Reveal phase
  return (
    <div className="text-center">
      <p className="text-2xl text-gray-500 mb-2">The word was:</p>
      <p className="text-5xl font-bold text-game-primary animate-pop">
        {rd?.prompt}
      </p>
    </div>
  )
}

function StoryDisplay({ session, phase }: { session: GameSession; phase: string }) {
  const rd = session.roundData
  const submissions = Object.values(rd?.submissions || {})
    .sort((a, b) => a.submittedAt - b.submittedAt)

  if (phase === 'input') {
    const currentWriter = session.players[submissions.length]
    return (
      <div className="text-center">
        <p className="text-2xl text-gray-500 mb-4">
          {currentWriter?.name || 'Someone'} is writing...
        </p>
        <div className="text-8xl animate-bounce-slow">✍️</div>
        <p className="text-xl text-gray-400 mt-4">
          Sentence {submissions.length + 1} of {session.players.length}
        </p>
      </div>
    )
  }

  // Reveal phase - show full story
  return (
    <div className="space-y-4 text-left">
      <p className="text-lg text-gray-600 italic animate-slide-up">
        {rd?.prompt}
      </p>
      {submissions.map((sub, i) => {
        const player = session.players.find(p => p.id === sub.playerId)
        return (
          <div
            key={i}
            className="flex gap-3 items-start animate-slide-up"
            style={{ animationDelay: `${(i + 1) * 500}ms` }}
          >
            <span className="text-2xl">{player?.avatar}</span>
            <p className="text-lg text-gray-800">{sub.content as string}</p>
          </div>
        )
      })}
    </div>
  )
}

function EmojiDisplay({ session, phase }: { session: GameSession; phase: string }) {
  const rd = session.roundData

  if (phase === 'input') {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-500 mb-4">Think of 3 emojis for:</p>
        <p className="text-4xl font-bold text-gray-800 mb-8">{rd?.prompt}</p>
        <div className="text-8xl animate-pulse-fast">🤔</div>
      </div>
    )
  }

  // Reveal phase
  const submissions = Object.entries(rd?.submissions || {})

  return (
    <div className="space-y-6">
      <p className="text-2xl text-gray-600 text-center mb-4">{rd?.prompt}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {submissions.map(([playerId, sub], i) => {
          const player = session.players.find(p => p.id === playerId)
          const emojis = sub.content as string[]
          return (
            <div
              key={playerId}
              className="bg-gray-50 rounded-2xl p-4 text-center animate-pop"
              style={{ animationDelay: `${i * 200}ms` }}
            >
              <span className="text-3xl">{player?.avatar}</span>
              <p className="font-medium text-gray-700 mt-1">{player?.name}</p>
              <p className="text-4xl mt-2">{emojis.join(' ')}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BluffDisplay({ session, phase }: { session: GameSession; phase: string }) {
  const rd = session.roundData
  const truthPlayer = session.players.find(p => p.id === rd?.activePlayerId)

  if (phase === 'input') {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-500 mb-4">The question is:</p>
        <p className="text-3xl font-bold text-gray-800 mb-8">{rd?.prompt}</p>
        <p className="text-lg text-gray-500">
          {truthPlayer?.name} knows the truth...
        </p>
        <p className="text-lg text-gray-500 mt-2">
          Everyone else: make up a convincing answer!
        </p>
      </div>
    )
  }

  if (phase === 'voting') {
    const allAnswers = Object.entries(rd?.submissions || {})
    // Shuffle answers so truth isn't always in same position
    const shuffled = [...allAnswers].sort(() => Math.random() - 0.5)

    return (
      <div>
        <p className="text-2xl text-gray-600 text-center mb-6">{rd?.prompt}</p>
        <div className="space-y-3">
          {shuffled.map(([playerId, sub], i) => (
            <div
              key={playerId}
              className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-2xl font-bold text-game-primary w-8">
                {String.fromCharCode(65 + i)}
              </span>
              <p className="text-xl text-gray-800">{sub.content as string}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 mt-6">
          Vote on your phone!
        </p>
      </div>
    )
  }

  // Reveal
  const truthAnswer = rd?.submissions[rd?.activePlayerId || '']
  return (
    <div className="text-center">
      <p className="text-xl text-gray-500 mb-2">The real answer is:</p>
      <p className="text-4xl font-bold text-game-success animate-pop">
        {truthAnswer?.content as string}
      </p>
      <div className="mt-4 flex justify-center items-center gap-2">
        <span className="text-4xl">{truthPlayer?.avatar}</span>
        <span className="text-xl text-gray-600">{truthPlayer?.name} had the truth!</span>
      </div>
    </div>
  )
}

function ClashDisplay({ session, phase }: { session: GameSession; phase: string }) {
  const rd = session.roundData

  if (phase === 'input') {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-500 mb-4">Name...</p>
        <p className="text-5xl font-bold text-gray-800 animate-pop">{rd?.prompt}</p>
        <p className="text-xl text-game-warning mt-6">
          Be unique! Matching answers score nothing!
        </p>
      </div>
    )
  }

  // Reveal - group by answer
  const answerGroups: Record<string, string[]> = {}
  for (const [playerId, sub] of Object.entries(rd?.submissions || {})) {
    const answer = (sub.content as string).toLowerCase().trim()
    if (!answerGroups[answer]) answerGroups[answer] = []
    answerGroups[answer].push(playerId)
  }

  return (
    <div>
      <p className="text-2xl text-gray-600 text-center mb-6">{rd?.prompt}</p>
      <div className="space-y-3">
        {Object.entries(answerGroups).map(([answer, playerIds], i) => {
          const isUnique = playerIds.length === 1
          const players = playerIds.map(id =>
            session.players.find(p => p.id === id)
          )
          return (
            <div
              key={answer}
              className={`rounded-xl p-4 flex items-center justify-between animate-slide-up ${
                isUnique ? 'bg-game-success/20' : 'bg-red-100'
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {players.map(p => p?.avatar).join(' ')}
                </span>
                <p className="text-xl text-gray-800 font-medium">{answer}</p>
              </div>
              <span className="text-2xl">
                {isUnique ? '✅ +100' : '❌ 0'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// ROUND END SCREEN
// ============================================

function RoundEndScreen({
  session,
  onAction
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
}) {
  const game = GAMES.find(g => g.type === session.gameType)!
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score)

  return (
    <div
      className="min-h-screen p-8 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` }}
    >
      <div className="bg-white rounded-3xl p-10 max-w-lg w-full shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Round {session.currentRound} Complete!
        </h2>

        <div className="space-y-3 mb-8">
          {sortedPlayers.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-4 rounded-xl animate-slide-up ${
                i === 0 ? 'bg-amber-100' : 'bg-gray-50'
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-3xl font-bold text-gray-400 w-8">
                {i + 1}
              </span>
              <span className="text-4xl">{player.avatar}</span>
              <span className="text-xl font-medium text-gray-800 flex-1">
                {player.name}
              </span>
              <span className="text-2xl font-bold" style={{ color: game.color }}>
                {player.score}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onAction('start-round')}
          className="w-full py-5 text-white text-2xl font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg"
          style={{ backgroundColor: game.color }}
        >
          Next Round! →
        </button>
      </div>
    </div>
  )
}

// ============================================
// GAME END SCREEN
// ============================================

function GameEndScreen({
  session,
  onAction
}: {
  session: GameSession
  onAction: (action: string, payload?: Record<string, unknown>) => void
}) {
  const game = GAMES.find(g => g.type === session.gameType)!
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 p-8 flex items-center justify-center relative overflow-hidden">
      {/* Confetti effect */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          >
            {['🎉', '🎊', '⭐', '✨', '💫'][Math.floor(Math.random() * 5)]}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-10 max-w-lg w-full shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="text-8xl mb-4 animate-bounce-slow">🏆</div>
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            {winner?.name} Wins!
          </h2>
          <p className="text-2xl text-amber-500 font-bold">
            {winner?.score} points
          </p>
        </div>

        {/* Podium */}
        <div className="flex justify-center items-end gap-4 mb-8">
          {sortedPlayers.slice(0, 3).map((player, i) => {
            const heights = ['h-32', 'h-24', 'h-20']
            const medals = ['🥇', '🥈', '🥉']
            const order = [1, 0, 2] // Display order: 2nd, 1st, 3rd
            const displayPlayer = sortedPlayers[order[i]]
            if (!displayPlayer) return null

            return (
              <div
                key={displayPlayer.id}
                className={`flex flex-col items-center ${i === 1 ? '-order-1' : ''}`}
              >
                <span className="text-4xl mb-2">{displayPlayer.avatar}</span>
                <span className="text-2xl">{medals[order[i]]}</span>
                <div
                  className={`w-24 ${heights[order[i]]} bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-xl flex items-end justify-center pb-2`}
                >
                  <span className="font-bold text-gray-600">
                    {displayPlayer.score}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onAction('next-game')}
            className="w-full py-4 bg-game-primary text-white text-xl font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Play Another Game! 🎮
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-gray-100 text-gray-600 text-lg rounded-xl hover:bg-gray-200 transition-all"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  )
}

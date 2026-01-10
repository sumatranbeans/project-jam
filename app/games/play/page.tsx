'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { GameSession, Player, GAMES, AVATARS } from '@/lib/games/types'
import { EMOJI_PALETTE } from '@/lib/games/content'

// ============================================
// PHONE CONTROLLER - Individual player device
// ============================================

export default function PhoneControllerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-game-primary via-purple-600 to-game-secondary flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading...</div>
      </div>
    }>
      <PhoneController />
    </Suspense>
  )
}

function PhoneController() {
  const searchParams = useSearchParams()
  const [session, setSession] = useState<GameSession | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')

  // Get current player from session
  const player = session?.players.find(p => p.id === playerId)

  // Pre-fill join code from URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setJoinCode(codeFromUrl.toUpperCase())
    }
  }, [searchParams])

  // Try to restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('playerSession')
    if (stored) {
      const { sessionId, playerId: storedPlayerId } = JSON.parse(stored)
      setPlayerId(storedPlayerId)
      // Try to reconnect
      fetch(`/api/games/session?sessionId=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.session) {
            setSession(data.session)
          } else {
            localStorage.removeItem('playerSession')
          }
        })
        .catch(() => {
          localStorage.removeItem('playerSession')
        })
    }
  }, [])

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
          localStorage.removeItem('playerSession')
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

  // Join a game session
  const joinSession = async () => {
    if (!joinCode.trim() || !playerName.trim()) {
      setError('Please enter both code and name')
      return
    }
    setIsJoining(true)
    setError('')

    try {
      const res = await fetch('/api/games/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: joinCode.toUpperCase().trim(),
          playerName: playerName.trim()
        })
      })
      const data = await res.json()
      if (data.session) {
        setSession(data.session)
        setPlayerId(data.playerId)
        localStorage.setItem('playerSession', JSON.stringify({
          sessionId: data.session.id,
          playerId: data.playerId
        }))
      } else {
        setError(data.error || 'Could not join game')
      }
    } catch (e) {
      setError('Connection error')
    } finally {
      setIsJoining(false)
    }
  }

  // Submit action to server
  const submitAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!session || !playerId) return

    try {
      const res = await fetch('/api/games/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sessionId: session.id,
          playerId,
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

  // No session - show join screen
  if (!session || !player) {
    return <JoinScreen
      joinCode={joinCode}
      setJoinCode={setJoinCode}
      playerName={playerName}
      setPlayerName={setPlayerName}
      onJoin={joinSession}
      isJoining={isJoining}
      error={error}
    />
  }

  // Route to appropriate controller based on game state
  switch (session.state) {
    case 'lobby':
      return <LobbyController player={player} session={session} />
    case 'selecting':
      return <SelectingController player={player} session={session} />
    case 'instructions':
      return <InstructionsController player={player} session={session} />
    case 'playing':
      return <PlayingController
        player={player}
        session={session}
        onSubmit={(content) => submitAction('submit', { content })}
        onVote={(vote) => submitAction('vote', { vote })}
      />
    case 'round-end':
      return <RoundEndController player={player} session={session} />
    case 'game-end':
      return <GameEndController player={player} session={session} />
    default:
      return <LobbyController player={player} session={session} />
  }
}

// ============================================
// JOIN SCREEN
// ============================================

function JoinScreen({
  joinCode,
  setJoinCode,
  playerName,
  setPlayerName,
  onJoin,
  isJoining,
  error
}: {
  joinCode: string
  setJoinCode: (code: string) => void
  playerName: string
  setPlayerName: (name: string) => void
  onJoin: () => void
  isJoining: boolean
  error: string
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary via-purple-600 to-game-secondary flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-pop">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎮</div>
          <h1 className="text-3xl font-bold text-gray-800">Join Game</h1>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Game Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              maxLength={4}
              className="w-full px-4 py-4 text-center text-3xl font-bold tracking-[0.3em] border-2 border-gray-200 rounded-2xl focus:border-game-primary focus:outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onJoin()}
              placeholder="Enter your name..."
              maxLength={15}
              className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-2xl focus:border-game-primary focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-center text-sm animate-wiggle">{error}</p>
          )}

          <button
            onClick={onJoin}
            disabled={isJoining}
            className="w-full py-4 bg-gradient-to-r from-game-primary to-game-secondary text-white text-xl font-bold rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
          >
            {isJoining ? '⏳ Joining...' : 'Join! 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// LOBBY CONTROLLER
// ============================================

function LobbyController({ player, session }: { player: Player; session: GameSession }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6">
      <div className="max-w-sm mx-auto">
        {/* Player Card */}
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl mb-6 animate-pop">
          <div className="text-7xl mb-4">{player.avatar}</div>
          <h2 className="text-2xl font-bold text-gray-800">{player.name}</h2>
          {player.isHost && (
            <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
              👑 Host
            </span>
          )}
        </div>

        {/* Waiting Message */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-6 text-center">
          <p className="text-white text-xl mb-2">You&apos;re in!</p>
          <p className="text-white/80">
            Waiting for the host to choose a game...
          </p>
          <div className="flex justify-center gap-2 mt-4">
            {session.players.map(p => (
              <span key={p.id} className="text-3xl">{p.avatar}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SELECTING CONTROLLER
// ============================================

function SelectingController({ player, session }: { player: Player; session: GameSession }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary p-6 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-6xl mb-4 animate-bounce-slow">🎲</div>
        <h2 className="text-2xl font-bold mb-2">Choosing a Game...</h2>
        <p className="text-white/80">Watch the TV!</p>
      </div>
    </div>
  )
}

// ============================================
// INSTRUCTIONS CONTROLLER
// ============================================

function InstructionsController({ player, session }: { player: Player; session: GameSession }) {
  const game = GAMES.find(g => g.type === session.gameType)

  return (
    <div
      className="min-h-screen p-6 flex items-center justify-center"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="text-center text-white">
        <div className="text-7xl mb-4">{game?.icon}</div>
        <h2 className="text-3xl font-bold mb-2">{game?.name}</h2>
        <p className="text-xl text-white/80 mb-6">{game?.tagline}</p>
        <div className="bg-white/20 backdrop-blur rounded-2xl p-6">
          <p className="text-lg">Get ready...</p>
          <p className="text-white/80 mt-2">Watch the TV for instructions!</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// PLAYING CONTROLLER - Main game input
// ============================================

function PlayingController({
  player,
  session,
  onSubmit,
  onVote
}: {
  player: Player
  session: GameSession
  onSubmit: (content: string | string[]) => void
  onVote: (vote: string) => void
}) {
  const game = GAMES.find(g => g.type === session.gameType)
  const rd = session.roundData
  const hasSubmitted = rd?.submissions[player.id]

  // Show appropriate input based on game type
  if (hasSubmitted && rd?.phase === 'input') {
    return <WaitingView game={game} message="Waiting for others..." />
  }

  if (rd?.phase === 'voting') {
    return <VotingView session={session} player={player} onVote={onVote} game={game} />
  }

  if (rd?.phase === 'reveal' || rd?.phase === 'scoring') {
    return <WaitingView game={game} message="Watch the TV!" />
  }

  // Game-specific input
  switch (session.gameType) {
    case 'doodle-detective':
      return <DoodleInput
        session={session}
        player={player}
        onSubmit={onSubmit}
        game={game}
      />
    case 'story-stacker':
      return <StoryInput
        session={session}
        player={player}
        onSubmit={onSubmit}
        game={game}
      />
    case 'emoji-telepathy':
      return <EmojiInput
        session={session}
        player={player}
        onSubmit={onSubmit}
        game={game}
      />
    case 'bluff-master':
      return <BluffInput
        session={session}
        player={player}
        onSubmit={onSubmit}
        game={game}
      />
    case 'category-clash':
      return <ClashInput
        session={session}
        player={player}
        onSubmit={onSubmit}
        game={game}
      />
    default:
      return <WaitingView game={game} message="Get ready..." />
  }
}

// ============================================
// WAITING VIEW
// ============================================

function WaitingView({ game, message }: { game: typeof GAMES[0] | undefined; message: string }) {
  return (
    <div
      className="min-h-screen p-6 flex items-center justify-center"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="text-center text-white">
        <div className="text-6xl mb-4 animate-pulse-fast">⏳</div>
        <p className="text-2xl font-bold">{message}</p>
      </div>
    </div>
  )
}

// ============================================
// VOTING VIEW
// ============================================

function VotingView({
  session,
  player,
  onVote,
  game
}: {
  session: GameSession
  player: Player
  onVote: (vote: string) => void
  game: typeof GAMES[0] | undefined
}) {
  const rd = session.roundData
  const hasVoted = rd?.votes[player.id]

  if (hasVoted) {
    return <WaitingView game={game} message="Vote recorded!" />
  }

  // For Bluff Master
  if (session.gameType === 'bluff-master') {
    const answers = Object.entries(rd?.submissions || {})
      .filter(([id]) => id !== player.id) // Can't vote for yourself

    return (
      <div
        className="min-h-screen p-6"
        style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
      >
        <div className="max-w-sm mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-6">
            Which is the REAL answer?
          </h2>
          <div className="space-y-3">
            {answers.map(([playerId, sub], i) => (
              <button
                key={playerId}
                onClick={() => onVote(playerId)}
                className="w-full bg-white rounded-xl p-4 text-left hover:scale-[1.02] transition-transform shadow-lg animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <span className="text-lg font-bold text-game-primary mr-3">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-gray-800">{sub.content as string}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return <WaitingView game={game} message="Vote time!" />
}

// ============================================
// DOODLE INPUT - Drawing or Guessing
// ============================================

function DoodleInput({
  session,
  player,
  onSubmit,
  game
}: {
  session: GameSession
  player: Player
  onSubmit: (content: string) => void
  game: typeof GAMES[0] | undefined
}) {
  const rd = session.roundData
  const isDrawer = rd?.activePlayerId === player.id
  const [guess, setGuess] = useState('')

  if (isDrawer) {
    // Show the word to draw
    return (
      <div
        className="min-h-screen p-6"
        style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
      >
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-3xl p-8 text-center shadow-xl animate-pop">
            <p className="text-gray-500 mb-2">Draw this word:</p>
            <p className="text-4xl font-bold text-gray-800 mb-6">{rd?.prompt}</p>
            <DrawingCanvas onSave={(data) => onSubmit(JSON.stringify(data))} />
          </div>
        </div>
      </div>
    )
  }

  // Guessing view
  return (
    <div
      className="min-h-screen p-6"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-xl animate-pop">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🔍</div>
            <p className="text-xl text-gray-600">What are they drawing?</p>
          </div>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && guess.trim()) {
                onSubmit(guess.trim())
              }
            }}
            placeholder="Type your guess..."
            className="w-full px-4 py-4 text-xl border-2 border-gray-200 rounded-2xl focus:border-doodle focus:outline-none mb-4"
            autoFocus
          />
          <button
            onClick={() => guess.trim() && onSubmit(guess.trim())}
            disabled={!guess.trim()}
            className="w-full py-4 bg-doodle text-white text-xl font-bold rounded-2xl disabled:opacity-50 transition-all"
          >
            Submit Guess!
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// DRAWING CANVAS
// ============================================

function DrawingCanvas({ onSave }: { onSave: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')

  const colors = ['#000000', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 4
  }, [])

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.strokeStyle = color
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const saveDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL())
  }

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="w-full aspect-square border-2 border-gray-200 rounded-xl touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {/* Color palette */}
      <div className="flex justify-center gap-2">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-10 h-10 rounded-full transition-transform ${
              color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={clearCanvas}
          className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium"
        >
          Clear
        </button>
        <button
          onClick={saveDrawing}
          className="flex-1 py-3 bg-doodle text-white rounded-xl font-bold"
        >
          Done! ✓
        </button>
      </div>
    </div>
  )
}

// ============================================
// STORY INPUT
// ============================================

function StoryInput({
  session,
  player,
  onSubmit,
  game
}: {
  session: GameSession
  player: Player
  onSubmit: (content: string) => void
  game: typeof GAMES[0] | undefined
}) {
  const rd = session.roundData
  const submissions = Object.values(rd?.submissions || {})
  const myTurn = submissions.length === session.players.findIndex(p => p.id === player.id)
  const [sentence, setSentence] = useState('')

  // Get previous sentence (or starter)
  const previousSentence = submissions.length === 0
    ? rd?.prompt
    : submissions[submissions.length - 1]?.content as string

  if (!myTurn) {
    return <WaitingView game={game} message="Wait for your turn..." />
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-xl animate-pop">
          <p className="text-gray-500 text-sm mb-2">Previous sentence:</p>
          <p className="text-gray-800 italic mb-6 p-3 bg-gray-50 rounded-xl">
            &ldquo;{previousSentence}&rdquo;
          </p>

          <p className="text-gray-600 mb-2">Continue the story:</p>
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="Add your sentence..."
            maxLength={150}
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-story focus:outline-none resize-none mb-4"
            autoFocus
          />

          <button
            onClick={() => sentence.trim() && onSubmit(sentence.trim())}
            disabled={!sentence.trim()}
            className="w-full py-4 bg-story text-white text-xl font-bold rounded-xl disabled:opacity-50 transition-all"
          >
            Add to Story!
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// EMOJI INPUT
// ============================================

function EmojiInput({
  session,
  player,
  onSubmit,
  game
}: {
  session: GameSession
  player: Player
  onSubmit: (content: string[]) => void
  game: typeof GAMES[0] | undefined
}) {
  const rd = session.roundData
  const [selected, setSelected] = useState<string[]>([])

  const toggleEmoji = (emoji: string) => {
    if (selected.includes(emoji)) {
      setSelected(selected.filter(e => e !== emoji))
    } else if (selected.length < 3) {
      setSelected([...selected, emoji])
    }
  }

  return (
    <div
      className="min-h-screen p-4"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="max-w-sm mx-auto">
        {/* Prompt */}
        <div className="bg-white rounded-2xl p-4 text-center mb-4 shadow-lg">
          <p className="text-gray-500 text-sm">Pick 3 emojis for:</p>
          <p className="text-xl font-bold text-gray-800">{rd?.prompt}</p>
        </div>

        {/* Selected */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex justify-center gap-4 min-h-[60px]">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                  selected[i]
                    ? 'bg-emoji/20 animate-pop'
                    : 'bg-gray-100 border-2 border-dashed border-gray-300'
                }`}
                onClick={() => selected[i] && toggleEmoji(selected[i])}
              >
                {selected[i] || '?'}
              </div>
            ))}
          </div>
        </div>

        {/* Emoji Grid */}
        <div className="bg-white rounded-2xl p-3 shadow-lg mb-4 max-h-[40vh] overflow-y-auto">
          <div className="grid grid-cols-7 gap-1">
            {EMOJI_PALETTE.map(emoji => (
              <button
                key={emoji}
                onClick={() => toggleEmoji(emoji)}
                className={`text-2xl p-2 rounded-lg transition-all ${
                  selected.includes(emoji)
                    ? 'bg-emoji/30 scale-110'
                    : 'hover:bg-gray-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={() => selected.length === 3 && onSubmit(selected)}
          disabled={selected.length !== 3}
          className="w-full py-4 bg-emoji text-white text-xl font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg"
        >
          {selected.length === 3 ? 'Lock In! 🔮' : `Pick ${3 - selected.length} more`}
        </button>
      </div>
    </div>
  )
}

// ============================================
// BLUFF INPUT
// ============================================

function BluffInput({
  session,
  player,
  onSubmit,
  game
}: {
  session: GameSession
  player: Player
  onSubmit: (content: string) => void
  game: typeof GAMES[0] | undefined
}) {
  const rd = session.roundData
  const isTruthKnower = rd?.activePlayerId === player.id
  const [answer, setAnswer] = useState('')

  if (isTruthKnower) {
    // Truth knower just waits
    const truthAnswer = rd?.submissions[player.id]?.content as string
    return (
      <div
        className="min-h-screen p-6 flex items-center justify-center"
        style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
      >
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl max-w-sm">
          <div className="text-5xl mb-4">🤫</div>
          <p className="text-gray-500 mb-2">You have the truth!</p>
          <p className="text-2xl font-bold text-gray-800 p-4 bg-game-success/10 rounded-xl">
            {truthAnswer}
          </p>
          <p className="text-gray-500 mt-4">
            Wait for others to make up fake answers...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-xl animate-pop">
          <p className="text-gray-500 mb-2">The question:</p>
          <p className="text-xl font-bold text-gray-800 mb-6 p-3 bg-gray-50 rounded-xl">
            {rd?.prompt}
          </p>

          <div className="text-center mb-4">
            <span className="text-4xl">🎭</span>
            <p className="text-gray-600 mt-2">
              Make up a convincing fake answer!
            </p>
          </div>

          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && answer.trim()) {
                onSubmit(answer.trim())
              }
            }}
            placeholder="Your fake answer..."
            maxLength={50}
            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-bluff focus:outline-none mb-4"
            autoFocus
          />

          <button
            onClick={() => answer.trim() && onSubmit(answer.trim())}
            disabled={!answer.trim()}
            className="w-full py-4 bg-bluff text-white text-xl font-bold rounded-xl disabled:opacity-50 transition-all"
          >
            Submit Bluff! 🎭
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// CLASH INPUT
// ============================================

function ClashInput({
  session,
  player,
  onSubmit,
  game
}: {
  session: GameSession
  player: Player
  onSubmit: (content: string) => void
  game: typeof GAMES[0] | undefined
}) {
  const rd = session.roundData
  const [answer, setAnswer] = useState('')

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-xl animate-pop">
          <p className="text-gray-500 text-center mb-2">Name...</p>
          <p className="text-3xl font-bold text-gray-800 text-center mb-6">
            {rd?.prompt}
          </p>

          <div className="text-center mb-4">
            <span className="text-4xl">⚡</span>
            <p className="text-clash font-medium mt-2">
              Think different! Unique answers score!
            </p>
          </div>

          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && answer.trim()) {
                onSubmit(answer.trim())
              }
            }}
            placeholder="Your answer..."
            maxLength={30}
            className="w-full px-4 py-4 text-xl border-2 border-gray-200 rounded-xl focus:border-clash focus:outline-none mb-4"
            autoFocus
          />

          <button
            onClick={() => answer.trim() && onSubmit(answer.trim())}
            disabled={!answer.trim()}
            className="w-full py-4 bg-clash text-white text-xl font-bold rounded-xl disabled:opacity-50 transition-all"
          >
            Submit! ⚡
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ROUND END CONTROLLER
// ============================================

function RoundEndController({ player, session }: { player: Player; session: GameSession }) {
  const game = GAMES.find(g => g.type === session.gameType)
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score)
  const myRank = sortedPlayers.findIndex(p => p.id === player.id) + 1

  return (
    <div
      className="min-h-screen p-6 flex items-center justify-center"
      style={{ background: game ? `linear-gradient(135deg, ${game.color}cc, ${game.color}88)` : undefined }}
    >
      <div className="bg-white rounded-3xl p-8 text-center shadow-xl max-w-sm w-full">
        <div className="text-6xl mb-4">{player.avatar}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Round Complete!
        </h2>
        <div className="text-5xl font-bold mb-2" style={{ color: game?.color }}>
          {player.score} pts
        </div>
        <p className="text-gray-500">
          You&apos;re in {myRank === 1 ? '1st' : myRank === 2 ? '2nd' : myRank === 3 ? '3rd' : `${myRank}th`} place!
        </p>
        {myRank === 1 && <p className="text-xl mt-2">👑</p>}
      </div>
    </div>
  )
}

// ============================================
// GAME END CONTROLLER
// ============================================

function GameEndController({ player, session }: { player: Player; session: GameSession }) {
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score)
  const isWinner = sortedPlayers[0]?.id === player.id
  const myRank = sortedPlayers.findIndex(p => p.id === player.id) + 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 p-6 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 text-center shadow-xl max-w-sm w-full">
        {isWinner ? (
          <>
            <div className="text-7xl mb-4 animate-bounce-slow">🏆</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">You Won!</h2>
          </>
        ) : (
          <>
            <div className="text-6xl mb-4">{player.avatar}</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {myRank === 2 ? 'So Close!' : myRank === 3 ? 'Great Job!' : 'Good Game!'}
            </h2>
          </>
        )}

        <div className="text-4xl font-bold text-amber-500 mb-4">
          {player.score} points
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {['🥇', '🥈', '🥉'][myRank - 1] && (
            <span className="text-4xl">{['🥇', '🥈', '🥉'][myRank - 1]}</span>
          )}
        </div>

        <p className="text-gray-500">Watch the TV for what&apos;s next!</p>
      </div>
    </div>
  )
}

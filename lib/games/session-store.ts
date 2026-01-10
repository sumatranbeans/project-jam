// In-memory session store for game sessions
// In production, this would be Redis or similar

import { GameSession, Player, GameType, GameSettings, RoundData, AVATARS } from './types'

// Global store for game sessions
const sessions = new Map<string, GameSession>()
const codeToId = new Map<string, string>() // join code -> session id

// Generate a random 4-letter join code
function generateCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Removed I and O to avoid confusion
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += letters[Math.floor(Math.random() * letters.length)]
  }
  // Ensure uniqueness
  if (codeToId.has(code)) {
    return generateCode()
  }
  return code
}

// Generate a unique session ID
function generateId(): string {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get a random avatar not already in use
function getAvailableAvatar(existingPlayers: Player[]): string {
  const usedAvatars = new Set(existingPlayers.map(p => p.avatar))
  const available = AVATARS.filter(a => !usedAvatars.has(a))
  if (available.length === 0) {
    return AVATARS[Math.floor(Math.random() * AVATARS.length)]
  }
  return available[Math.floor(Math.random() * available.length)]
}

// Create a new game session
export function createSession(hostName: string): { session: GameSession; playerId: string } {
  const sessionId = generateId()
  const code = generateCode()
  const playerId = generatePlayerId()

  const host: Player = {
    id: playerId,
    name: hostName,
    avatar: getAvailableAvatar([]),
    score: 0,
    isHost: true,
    connected: true,
    lastSeen: Date.now()
  }

  const session: GameSession = {
    id: sessionId,
    code,
    hostId: playerId,
    players: [host],
    gameType: null,
    state: 'lobby',
    settings: {
      difficulty: 'medium',
      roundCount: 5,
      timeLimit: 60,
      allowDropIn: true
    },
    currentRound: 0,
    totalRounds: 5,
    roundData: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  sessions.set(sessionId, session)
  codeToId.set(code, sessionId)

  return { session, playerId }
}

// Join an existing session
export function joinSession(code: string, playerName: string): { session: GameSession; playerId: string } | null {
  const sessionId = codeToId.get(code.toUpperCase())
  if (!sessionId) return null

  const session = sessions.get(sessionId)
  if (!session) return null

  // Check if game allows joining
  if (session.state !== 'lobby' && !session.settings.allowDropIn) {
    return null
  }

  // Check max players
  if (session.players.length >= 6) {
    return null
  }

  const playerId = generatePlayerId()
  const player: Player = {
    id: playerId,
    name: playerName,
    avatar: getAvailableAvatar(session.players),
    score: 0,
    isHost: false,
    connected: true,
    lastSeen: Date.now()
  }

  session.players.push(player)
  session.updatedAt = Date.now()

  return { session, playerId }
}

// Rejoin a session (for reconnection)
export function rejoinSession(sessionId: string, playerId: string): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  const player = session.players.find(p => p.id === playerId)
  if (!player) return null

  player.connected = true
  player.lastSeen = Date.now()
  session.updatedAt = Date.now()

  return session
}

// Get session by ID
export function getSession(sessionId: string): GameSession | null {
  return sessions.get(sessionId) || null
}

// Get session by join code
export function getSessionByCode(code: string): GameSession | null {
  const sessionId = codeToId.get(code.toUpperCase())
  if (!sessionId) return null
  return sessions.get(sessionId) || null
}

// Update session
export function updateSession(sessionId: string, updates: Partial<GameSession>): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  Object.assign(session, updates, { updatedAt: Date.now() })
  return session
}

// Update player in session
export function updatePlayer(sessionId: string, playerId: string, updates: Partial<Player>): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  const player = session.players.find(p => p.id === playerId)
  if (!player) return null

  Object.assign(player, updates)
  session.updatedAt = Date.now()

  return session
}

// Remove player from session
export function removePlayer(sessionId: string, playerId: string): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  session.players = session.players.filter(p => p.id !== playerId)

  // If host left, assign new host
  if (session.hostId === playerId && session.players.length > 0) {
    session.hostId = session.players[0].id
    session.players[0].isHost = true
  }

  session.updatedAt = Date.now()

  // Clean up empty sessions
  if (session.players.length === 0) {
    deleteSession(sessionId)
    return null
  }

  return session
}

// Start a game
export function startGame(sessionId: string, gameType: GameType): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  session.gameType = gameType
  session.state = 'instructions'
  session.currentRound = 0
  session.totalRounds = session.settings.roundCount
  session.updatedAt = Date.now()

  // Reset scores
  session.players.forEach(p => p.score = 0)

  return session
}

// Update round data
export function updateRound(sessionId: string, roundData: Partial<RoundData>): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  if (!session.roundData) {
    session.roundData = {
      roundNumber: session.currentRound,
      phase: 'prompt',
      submissions: {},
      votes: {},
      timer: session.settings.timeLimit,
      timerStarted: Date.now()
    }
  }

  Object.assign(session.roundData, roundData)
  session.updatedAt = Date.now()

  return session
}

// Add a submission
export function addSubmission(
  sessionId: string,
  playerId: string,
  content: string | string[]
): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session || !session.roundData) return null

  session.roundData.submissions[playerId] = {
    playerId,
    content,
    submittedAt: Date.now()
  }
  session.updatedAt = Date.now()

  return session
}

// Add a vote
export function addVote(sessionId: string, playerId: string, vote: string): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session || !session.roundData) return null

  session.roundData.votes[playerId] = vote
  session.updatedAt = Date.now()

  return session
}

// Delete session
export function deleteSession(sessionId: string): void {
  const session = sessions.get(sessionId)
  if (session) {
    codeToId.delete(session.code)
    sessions.delete(sessionId)
  }
}

// Clean up old sessions (run periodically)
export function cleanupOldSessions(): void {
  const oneHourAgo = Date.now() - 60 * 60 * 1000

  for (const [id, session] of sessions) {
    if (session.updatedAt < oneHourAgo) {
      deleteSession(id)
    }
  }
}

// Get all active session codes (for debugging)
export function getAllSessionCodes(): string[] {
  return Array.from(codeToId.keys())
}

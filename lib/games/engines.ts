// Game engines - logic for each game type

import { GameSession, RoundPhase, Player } from './types'
import {
  getRandomWord,
  getRandomStarter,
  getRandomEmojiPrompt,
  getRandomBluffQuestion,
  getRandomCategory
} from './content'
import { updateSession, updateRound, getSession } from './session-store'

// ============================================
// DOODLE DETECTIVE
// ============================================

export function startDoodleRound(session: GameSession): GameSession | null {
  const word = getRandomWord(session.settings.difficulty)

  // Pick a random drawer (rotating through players)
  const drawerIndex = session.currentRound % session.players.length
  const drawer = session.players[drawerIndex]

  const updatedSession = updateRound(session.id, {
    roundNumber: session.currentRound + 1,
    phase: 'prompt',
    prompt: word,
    activePlayerId: drawer.id,
    submissions: {},
    votes: {},
    timer: session.settings.timeLimit,
    timerStarted: Date.now()
  })

  if (updatedSession) {
    updatedSession.currentRound++
    updatedSession.state = 'playing'
  }

  return updatedSession
}

export function scoreDoodleRound(session: GameSession): Record<string, number> {
  const scores: Record<string, number> = {}
  const roundData = session.roundData
  if (!roundData) return scores

  const drawerId = roundData.activePlayerId
  const correctWord = roundData.prompt?.toLowerCase()

  // Check each guess
  let correctGuesses = 0
  for (const [playerId, submission] of Object.entries(roundData.submissions)) {
    if (playerId === drawerId) continue

    const guess = (submission.content as string).toLowerCase().trim()
    if (guess === correctWord) {
      // Correct guess: +100 points
      scores[playerId] = (scores[playerId] || 0) + 100
      correctGuesses++
    }
  }

  // Drawer gets points based on how many guessed correctly
  if (drawerId) {
    scores[drawerId] = (scores[drawerId] || 0) + (correctGuesses * 50)
  }

  return scores
}

// ============================================
// STORY STACKER
// ============================================

export function startStoryRound(session: GameSession): GameSession | null {
  const starter = getRandomStarter()

  const updatedSession = updateRound(session.id, {
    roundNumber: session.currentRound + 1,
    phase: 'input',
    prompt: starter,
    activePlayerId: session.players[0].id, // First player starts
    submissions: {},
    votes: {},
    timer: 30, // 30 seconds per player
    timerStarted: Date.now()
  })

  if (updatedSession) {
    updatedSession.currentRound++
    updatedSession.state = 'playing'
  }

  return updatedSession
}

export function getNextStoryWriter(session: GameSession): string | null {
  if (!session.roundData) return null

  const writtenCount = Object.keys(session.roundData.submissions).length
  if (writtenCount >= session.players.length) {
    return null // Everyone has written
  }

  return session.players[writtenCount].id
}

export function getLastSentence(session: GameSession): string {
  if (!session.roundData) return ''

  const submissions = Object.values(session.roundData.submissions)
  if (submissions.length === 0) {
    return session.roundData.prompt || ''
  }

  // Get the most recent submission
  const sorted = submissions.sort((a, b) => b.submittedAt - a.submittedAt)
  return sorted[0].content as string
}

export function getFullStory(session: GameSession): string[] {
  if (!session.roundData) return []

  const starter = session.roundData.prompt || ''
  const submissions = Object.values(session.roundData.submissions)
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .map(s => s.content as string)

  return [starter, ...submissions]
}

// Story scoring: everyone gets points for participating, bonus for votes
export function scoreStoryRound(session: GameSession): Record<string, number> {
  const scores: Record<string, number> = {}
  const roundData = session.roundData
  if (!roundData) return scores

  // Participation points
  for (const playerId of Object.keys(roundData.submissions)) {
    scores[playerId] = (scores[playerId] || 0) + 50
  }

  // Vote for favorite sentence (optional feature)
  for (const [, votedFor] of Object.entries(roundData.votes)) {
    scores[votedFor] = (scores[votedFor] || 0) + 25
  }

  return scores
}

// ============================================
// EMOJI TELEPATHY
// ============================================

export function startEmojiRound(session: GameSession): GameSession | null {
  const prompt = getRandomEmojiPrompt()

  const updatedSession = updateRound(session.id, {
    roundNumber: session.currentRound + 1,
    phase: 'input',
    prompt,
    submissions: {},
    votes: {},
    timer: 30,
    timerStarted: Date.now()
  })

  if (updatedSession) {
    updatedSession.currentRound++
    updatedSession.state = 'playing'
  }

  return updatedSession
}

export function scoreEmojiRound(session: GameSession): Record<string, number> {
  const scores: Record<string, number> = {}
  const roundData = session.roundData
  if (!roundData) return scores

  const submissions = Object.entries(roundData.submissions)

  // Compare each pair of players
  for (let i = 0; i < submissions.length; i++) {
    const [playerA, subA] = submissions[i]
    const emojisA = subA.content as string[]

    for (let j = i + 1; j < submissions.length; j++) {
      const [playerB, subB] = submissions[j]
      const emojisB = subB.content as string[]

      // Count matches
      let matches = 0
      for (const emoji of emojisA) {
        if (emojisB.includes(emoji)) {
          matches++
        }
      }

      // Points for matches (25 per match, max 75 for 3 matches)
      const matchPoints = matches * 25
      scores[playerA] = (scores[playerA] || 0) + matchPoints
      scores[playerB] = (scores[playerB] || 0) + matchPoints
    }
  }

  return scores
}

export function getEmojiMatches(session: GameSession): Record<string, { with: string; emojis: string[] }[]> {
  const matches: Record<string, { with: string; emojis: string[] }[]> = {}
  const roundData = session.roundData
  if (!roundData) return matches

  const submissions = Object.entries(roundData.submissions)

  for (let i = 0; i < submissions.length; i++) {
    const [playerA, subA] = submissions[i]
    const emojisA = subA.content as string[]
    matches[playerA] = []

    for (let j = 0; j < submissions.length; j++) {
      if (i === j) continue

      const [playerB, subB] = submissions[j]
      const emojisB = subB.content as string[]

      const commonEmojis = emojisA.filter(e => emojisB.includes(e))
      if (commonEmojis.length > 0) {
        matches[playerA].push({ with: playerB, emojis: commonEmojis })
      }
    }
  }

  return matches
}

// ============================================
// BLUFF MASTER
// ============================================

export function startBluffRound(session: GameSession): GameSession | null {
  const { q, a } = getRandomBluffQuestion(session.settings.difficulty)

  // Pick who knows the truth (rotating)
  const truthKnowerIndex = session.currentRound % session.players.length
  const truthKnower = session.players[truthKnowerIndex]

  const updatedSession = updateRound(session.id, {
    roundNumber: session.currentRound + 1,
    phase: 'input',
    prompt: q,
    activePlayerId: truthKnower.id,
    submissions: {
      // Pre-populate the truth answer
      [truthKnower.id]: {
        playerId: truthKnower.id,
        content: a,
        submittedAt: Date.now()
      }
    },
    votes: {},
    timer: 45,
    timerStarted: Date.now()
  })

  if (updatedSession) {
    updatedSession.currentRound++
    updatedSession.state = 'playing'
  }

  return updatedSession
}

export function getTruthPlayerId(session: GameSession): string | null {
  return session.roundData?.activePlayerId || null
}

export function scoreBluffRound(session: GameSession): Record<string, number> {
  const scores: Record<string, number> = {}
  const roundData = session.roundData
  if (!roundData) return scores

  const truthPlayerId = roundData.activePlayerId

  // Voting results
  for (const [voterId, votedFor] of Object.entries(roundData.votes)) {
    if (votedFor === truthPlayerId) {
      // Voted for the truth: voter gets 100 points
      scores[voterId] = (scores[voterId] || 0) + 100
    } else {
      // Fooled by a bluff: bluffer gets 50 points
      scores[votedFor] = (scores[votedFor] || 0) + 50
    }
  }

  // Truth teller gets bonus if less than half guessed correctly
  const totalVoters = Object.keys(roundData.votes).length
  const correctVotes = Object.values(roundData.votes).filter(v => v === truthPlayerId).length

  if (truthPlayerId && correctVotes < totalVoters / 2) {
    scores[truthPlayerId] = (scores[truthPlayerId] || 0) + 75
  }

  return scores
}

// ============================================
// CATEGORY CLASH
// ============================================

export function startClashRound(session: GameSession): GameSession | null {
  const category = getRandomCategory()

  const updatedSession = updateRound(session.id, {
    roundNumber: session.currentRound + 1,
    phase: 'input',
    prompt: category,
    submissions: {},
    votes: {},
    timer: 15, // Quick! 15 seconds
    timerStarted: Date.now()
  })

  if (updatedSession) {
    updatedSession.currentRound++
    updatedSession.state = 'playing'
  }

  return updatedSession
}

export function scoreClashRound(session: GameSession): Record<string, number> {
  const scores: Record<string, number> = {}
  const roundData = session.roundData
  if (!roundData) return scores

  // Normalize and count answers
  const answerCounts: Record<string, string[]> = {} // normalized answer -> player ids

  for (const [playerId, submission] of Object.entries(roundData.submissions)) {
    const answer = (submission.content as string).toLowerCase().trim()
    if (!answerCounts[answer]) {
      answerCounts[answer] = []
    }
    answerCounts[answer].push(playerId)
  }

  // Score: unique answers get points, duplicates get nothing
  for (const [, playerIds] of Object.entries(answerCounts)) {
    if (playerIds.length === 1) {
      // Unique answer!
      scores[playerIds[0]] = (scores[playerIds[0]] || 0) + 100
    }
    // Duplicate answers get 0 points
  }

  return scores
}

export function getAnswerBreakdown(session: GameSession): { answer: string; players: string[]; isUnique: boolean }[] {
  const roundData = session.roundData
  if (!roundData) return []

  const answerCounts: Record<string, string[]> = {}

  for (const [playerId, submission] of Object.entries(roundData.submissions)) {
    const answer = (submission.content as string).toLowerCase().trim()
    if (!answerCounts[answer]) {
      answerCounts[answer] = []
    }
    answerCounts[answer].push(playerId)
  }

  return Object.entries(answerCounts).map(([answer, players]) => ({
    answer,
    players,
    isUnique: players.length === 1
  }))
}

// ============================================
// COMMON UTILITIES
// ============================================

export function applyScores(session: GameSession, roundScores: Record<string, number>): void {
  for (const player of session.players) {
    if (roundScores[player.id]) {
      player.score += roundScores[player.id]
    }
  }
}

export function getWinner(session: GameSession): Player | null {
  if (session.players.length === 0) return null

  return session.players.reduce((winner, player) =>
    player.score > winner.score ? player : winner
  )
}

export function getRankings(session: GameSession): Player[] {
  return [...session.players].sort((a, b) => b.score - a.score)
}

export function isGameComplete(session: GameSession): boolean {
  return session.currentRound >= session.totalRounds
}

// Start appropriate round based on game type
export function startNextRound(session: GameSession): GameSession | null {
  switch (session.gameType) {
    case 'doodle-detective':
      return startDoodleRound(session)
    case 'story-stacker':
      return startStoryRound(session)
    case 'emoji-telepathy':
      return startEmojiRound(session)
    case 'bluff-master':
      return startBluffRound(session)
    case 'category-clash':
      return startClashRound(session)
    default:
      return null
  }
}

// Score current round based on game type
export function scoreCurrentRound(session: GameSession): Record<string, number> {
  switch (session.gameType) {
    case 'doodle-detective':
      return scoreDoodleRound(session)
    case 'story-stacker':
      return scoreStoryRound(session)
    case 'emoji-telepathy':
      return scoreEmojiRound(session)
    case 'bluff-master':
      return scoreBluffRound(session)
    case 'category-clash':
      return scoreClashRound(session)
    default:
      return {}
  }
}

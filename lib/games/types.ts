// Core game types for Project Jam multiplayer games

export interface Player {
  id: string
  name: string
  avatar: string // Emoji avatar
  score: number
  isHost: boolean
  connected: boolean
  lastSeen: number
}

export interface GameSession {
  id: string
  code: string // 4-letter join code
  hostId: string
  players: Player[]
  gameType: GameType | null
  state: GameState
  settings: GameSettings
  currentRound: number
  totalRounds: number
  roundData: RoundData | null
  createdAt: number
  updatedAt: number
}

export type GameType =
  | 'doodle-detective'
  | 'story-stacker'
  | 'emoji-telepathy'
  | 'bluff-master'
  | 'category-clash'

export type GameState =
  | 'lobby'           // Waiting for players
  | 'selecting'       // Choosing a game
  | 'instructions'    // Showing rules
  | 'playing'         // Active gameplay
  | 'round-end'       // Between rounds
  | 'game-end'        // Final scores
  | 'celebration'     // Winner celebration

export interface GameSettings {
  difficulty: 'easy' | 'medium' | 'hard'
  roundCount: 3 | 5 | 7
  timeLimit: number // seconds per round
  allowDropIn: boolean
}

export interface RoundData {
  roundNumber: number
  phase: RoundPhase
  prompt?: string
  activePlayerId?: string
  submissions: Record<string, PlayerSubmission>
  votes: Record<string, string>
  timer: number
  timerStarted: number
  revealedAt?: number
}

export type RoundPhase =
  | 'prompt'      // Showing the challenge
  | 'input'       // Players submitting
  | 'voting'      // Players voting
  | 'reveal'      // Showing results
  | 'scoring'     // Updating scores

export interface PlayerSubmission {
  playerId: string
  content: string | DrawingData | string[] // text, drawing, or emoji array
  submittedAt: number
}

export interface DrawingData {
  strokes: Stroke[]
  width: number
  height: number
}

export interface Stroke {
  points: Point[]
  color: string
  width: number
}

export interface Point {
  x: number
  y: number
}

// Game-specific data types
export interface DoodleDetectiveRound extends RoundData {
  word: string
  category: string
  drawerId: string
  guesses: Record<string, string>
  correctGuessers: string[]
}

export interface StoryStackerRound extends RoundData {
  sentences: { playerId: string; text: string }[]
  theme?: string
}

export interface EmojiTelepathyRound extends RoundData {
  prompt: string
  emojiSubmissions: Record<string, string[]>
  matches: Record<string, string[]> // playerId -> matching playerIds
}

export interface BluffMasterRound extends RoundData {
  question: string
  truthAnswer: string
  truthPlayerId: string
  fakeAnswers: Record<string, string>
  votes: Record<string, string> // voterId -> answerId
}

export interface CategoryClashRound extends RoundData {
  category: string
  answers: Record<string, string>
  uniqueAnswers: Record<string, boolean>
}

// Action types for real-time updates
export type GameAction =
  | { type: 'player-joined'; player: Player }
  | { type: 'player-left'; playerId: string }
  | { type: 'game-selected'; gameType: GameType }
  | { type: 'game-started' }
  | { type: 'round-started'; roundData: RoundData }
  | { type: 'submission'; playerId: string; submission: PlayerSubmission }
  | { type: 'vote'; playerId: string; vote: string }
  | { type: 'phase-change'; phase: RoundPhase }
  | { type: 'timer-tick'; remaining: number }
  | { type: 'round-ended'; scores: Record<string, number> }
  | { type: 'game-ended'; winner: Player; finalScores: Record<string, number> }
  | { type: 'state-sync'; session: GameSession }

// Avatar options - fun, expressive emoji
export const AVATARS = [
  '🦊', '🐸', '🦉', '🐙', '🦋', '🐢', '🦄', '🐼',
  '🦁', '🐨', '🦈', '🐝', '🦩', '🐲', '🦜', '🐳',
  '🌟', '🌈', '🔥', '💎', '🎨', '🎭', '🎪', '🚀'
]

// Game metadata for the hub
export interface GameInfo {
  type: GameType
  name: string
  tagline: string
  description: string
  icon: string
  color: string
  minPlayers: number
  maxPlayers: number
  duration: string
  educational: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export const GAMES: GameInfo[] = [
  {
    type: 'doodle-detective',
    name: 'Doodle Detective',
    tagline: 'Draw fast, guess faster!',
    description: 'One player draws while others race to guess. But here\'s the twist - the drawer can only see through a tiny keyhole! Watch as simple words become hilariously abstract art.',
    icon: '🎨',
    color: '#FF6B6B',
    minPlayers: 3,
    maxPlayers: 6,
    duration: '2-3 min',
    educational: ['Creativity', 'Visual thinking', 'Quick communication'],
    difficulty: 'easy'
  },
  {
    type: 'story-stacker',
    name: 'Story Stacker',
    tagline: 'One sentence at a time!',
    description: 'Build a story together, but each player only sees the previous sentence. Watch as your tale takes unexpected turns and reveals itself in a hilarious finale!',
    icon: '📚',
    color: '#4ECDC4',
    minPlayers: 3,
    maxPlayers: 6,
    duration: '3-4 min',
    educational: ['Creative writing', 'Narrative thinking', 'Reading comprehension'],
    difficulty: 'easy'
  },
  {
    type: 'emoji-telepathy',
    name: 'Emoji Telepathy',
    tagline: 'Think alike to win!',
    description: 'Everyone sees the same prompt and picks 3 emojis. The more players you match, the more points you score. Are you on the same wavelength?',
    icon: '🔮',
    color: '#9B59B6',
    minPlayers: 3,
    maxPlayers: 6,
    duration: '2-3 min',
    educational: ['Pattern recognition', 'Social awareness', 'Abstract thinking'],
    difficulty: 'easy'
  },
  {
    type: 'bluff-master',
    name: 'Bluff Master',
    tagline: 'Spot the truth!',
    description: 'One player knows the real answer. Everyone else makes up convincing fakes. Vote for the truth - but beware, the best liars win big!',
    icon: '🎭',
    color: '#E74C3C',
    minPlayers: 4,
    maxPlayers: 6,
    duration: '3-4 min',
    educational: ['Critical thinking', 'General knowledge', 'Reading people'],
    difficulty: 'medium'
  },
  {
    type: 'category-clash',
    name: 'Category Clash',
    tagline: 'Think different to win!',
    description: 'A category appears - race to type an answer! Score points for unique answers that nobody else thought of. Common answers score nothing!',
    icon: '⚡',
    color: '#F39C12',
    minPlayers: 3,
    maxPlayers: 6,
    duration: '2-3 min',
    educational: ['Vocabulary', 'Quick thinking', 'Divergent thinking'],
    difficulty: 'easy'
  }
]

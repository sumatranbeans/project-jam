/**
 * Project Jam: Core Game Types
 *
 * Shared types for all multiplayer family games.
 */

// ============================================
// Player & Session Types
// ============================================

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
}

export interface GameSession {
  id: string;
  gameType: GameType;
  status: GameStatus;
  hostId: string;
  players: Player[];
  currentRound: number;
  totalRounds: number;
  settings: GameSettings;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export type GameStatus =
  | 'waiting'      // Waiting for players to join
  | 'starting'     // Countdown to start
  | 'playing'      // Game in progress
  | 'round_end'    // Between rounds
  | 'finished';    // Game complete

export type GameType =
  | 'echo'
  | 'mind-meld'
  | 'reverse-charades'
  | 'alias-auction'
  | 'pixel-pals'
  | 'quick-think'
  | 'story-surge'
  | 'face-value';

// ============================================
// Game Settings
// ============================================

export interface GameSettings {
  difficulty: Difficulty;
  roundCount: number;
  timePerAction: number;  // seconds
  allowDropIn: boolean;
  category?: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'medium',
  roundCount: 5,
  timePerAction: 30,
  allowDropIn: false,
};

// ============================================
// Game Definitions
// ============================================

export interface GameDefinition {
  type: GameType;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedTime: string;
  learningFocus: string[];
  color: string;
}

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    type: 'mind-meld',
    name: 'Mind Meld',
    tagline: 'Think alike. Score big.',
    description: 'Everyone sees the same prompt and writes their answer secretly. Points for matching other players!',
    icon: '🧠',
    minPlayers: 3,
    maxPlayers: 6,
    estimatedTime: '2-3 min',
    learningFocus: ['Theory of mind', 'Quick thinking', 'Vocabulary'],
    color: '#8B5CF6', // Purple
  },
  {
    type: 'quick-think',
    name: 'Quick Think',
    tagline: 'Name it fast. Stay unique.',
    description: 'A category appears. Everyone types an answer. Duplicates are eliminated!',
    icon: '⚡',
    minPlayers: 3,
    maxPlayers: 6,
    estimatedTime: '1-2 min',
    learningFocus: ['Vocabulary', 'Speed', 'Creative thinking'],
    color: '#F59E0B', // Amber
  },
  {
    type: 'echo',
    name: 'Echo',
    tagline: 'Where messages transform.',
    description: 'Draw, describe, act, guess - watch how a word transforms through each player!',
    icon: '🎨',
    minPlayers: 4,
    maxPlayers: 6,
    estimatedTime: '3-5 min',
    learningFocus: ['Communication', 'Interpretation', 'Creativity'],
    color: '#10B981', // Emerald
  },
  {
    type: 'reverse-charades',
    name: 'Reverse Charades',
    tagline: 'Everyone acts. One guesses.',
    description: 'One player closes their eyes while everyone else acts out the same word!',
    icon: '🎭',
    minPlayers: 3,
    maxPlayers: 6,
    estimatedTime: '2-4 min',
    learningFocus: ['Teamwork', 'Physical expression', 'Vocabulary'],
    color: '#EF4444', // Red
  },
  {
    type: 'alias-auction',
    name: 'Alias Auction',
    tagline: 'Bid low. Describe better.',
    description: 'Bid on how few words you need to describe something. Win the bid, deliver the clue!',
    icon: '🎪',
    minPlayers: 3,
    maxPlayers: 6,
    estimatedTime: '3-5 min',
    learningFocus: ['Vocabulary', 'Risk assessment', 'Wordplay'],
    color: '#3B82F6', // Blue
  },
  {
    type: 'pixel-pals',
    name: 'Pixel Pals',
    tagline: 'Create for your secret partner.',
    description: 'Make something only your secretly-assigned partner will understand!',
    icon: '🔍',
    minPlayers: 4,
    maxPlayers: 6,
    estimatedTime: '3-5 min',
    learningFocus: ['Empathy', 'Personal connection', 'Creativity'],
    color: '#EC4899', // Pink
  },
  {
    type: 'story-surge',
    name: 'Story Surge',
    tagline: 'Build stories. Hide secrets.',
    description: 'Add sentences to a story while secretly including your assigned element!',
    icon: '🌊',
    minPlayers: 3,
    maxPlayers: 6,
    estimatedTime: '4-6 min',
    learningFocus: ['Creative writing', 'Collaboration', 'Stealth'],
    color: '#06B6D4', // Cyan
  },
  {
    type: 'face-value',
    name: 'Face Value',
    tagline: 'Make a face. We explain it.',
    description: 'One player makes an expression. Others write what caused it!',
    icon: '🎯',
    minPlayers: 3,
    maxPlayers: 6,
    estimatedTime: '2-3 min',
    learningFocus: ['Emotional intelligence', 'Humor', 'Creativity'],
    color: '#84CC16', // Lime
  },
];

// ============================================
// Mind Meld Specific Types
// ============================================

export interface MindMeldRound {
  roundNumber: number;
  prompt: string;
  category: string;
  answers: MindMeldAnswer[];
  phase: MindMeldPhase;
  phaseStartedAt: Date;
}

export interface MindMeldAnswer {
  playerId: string;
  answer: string;
  submittedAt: Date;
}

export interface MindMeldResult {
  answer: string;
  players: Player[];
  points: number;
  isPerfectMeld: boolean;
}

export type MindMeldPhase =
  | 'prompt'      // Showing the prompt
  | 'thinking'    // Players are typing
  | 'reveal'      // Showing all answers
  | 'scoring';    // Showing points

// ============================================
// Quick Think Specific Types
// ============================================

export interface QuickThinkRound {
  roundNumber: number;
  category: string;
  answers: QuickThinkAnswer[];
  phase: QuickThinkPhase;
  phaseStartedAt: Date;
}

export interface QuickThinkAnswer {
  playerId: string;
  answer: string;
  isUnique: boolean;
  isEliminated: boolean;
}

export type QuickThinkPhase =
  | 'category'    // Showing the category
  | 'thinking'    // Players are typing
  | 'reveal'      // Showing unique vs eliminated
  | 'scoring';    // Showing points

// ============================================
// Echo Specific Types
// ============================================

export interface EchoRound {
  roundNumber: number;
  originalWord: string;
  chain: EchoChainLink[];
  currentStep: number;
  phase: EchoPhase;
}

export interface EchoChainLink {
  playerId: string;
  type: 'draw' | 'describe' | 'act' | 'guess';
  content: string; // Drawing data, text, or guess
  submittedAt: Date;
}

export type EchoPhase =
  | 'creating'    // Current player is creating
  | 'revealing'   // Showing the chain
  | 'scoring';    // Final reveal and points

// ============================================
// Prompts & Content
// ============================================

export interface PromptCategory {
  id: string;
  name: string;
  difficulty: Difficulty;
  prompts: string[];
}

// Mind Meld Prompts
export const MIND_MELD_PROMPTS: PromptCategory[] = [
  {
    id: 'objects-easy',
    name: 'Simple Objects',
    difficulty: 'easy',
    prompts: [
      'Something yellow',
      'A fruit',
      'Something round',
      'An animal',
      'A color',
      'Something soft',
      'A number between 1 and 10',
      'A day of the week',
      'Something cold',
      'A vegetable',
    ],
  },
  {
    id: 'activities-medium',
    name: 'Activities',
    difficulty: 'medium',
    prompts: [
      'Something you do on vacation',
      'A sport',
      'A hobby',
      'Something you do before bed',
      'A birthday activity',
      'Something you do on weekends',
      'A summer activity',
      'Something fun to do with friends',
      'A rainy day activity',
      'Something you do in the morning',
    ],
  },
  {
    id: 'places-medium',
    name: 'Places',
    difficulty: 'medium',
    prompts: [
      'A country you want to visit',
      'A place to eat',
      'A vacation destination',
      'A room in a house',
      'A place with lots of people',
      'Somewhere peaceful',
      'A famous city',
      'A place with water',
      'Somewhere cold',
      'A fun place for kids',
    ],
  },
  {
    id: 'abstract-hard',
    name: 'Abstract',
    difficulty: 'hard',
    prompts: [
      'Something beautiful',
      'A reason to celebrate',
      'Something that makes you happy',
      'A word that describes summer',
      'Something precious',
      'A feeling',
      'Something that takes patience',
      'A quality you admire',
      'Something everyone needs',
      'A small pleasure in life',
    ],
  },
];

// Quick Think Categories
export const QUICK_THINK_CATEGORIES: PromptCategory[] = [
  {
    id: 'colors-easy',
    name: 'Colors',
    difficulty: 'easy',
    prompts: [
      'Things that are red',
      'Things that are blue',
      'Things that are green',
      'Things that are yellow',
      'Things that are white',
      'Things that are black',
      'Things that are orange',
      'Things that are purple',
      'Things that are pink',
      'Things that are brown',
    ],
  },
  {
    id: 'animals-easy',
    name: 'Animals',
    difficulty: 'easy',
    prompts: [
      'Animals with four legs',
      'Animals that fly',
      'Animals that swim',
      'Farm animals',
      'Zoo animals',
      'Pets',
      'Animals with stripes',
      'Baby animals',
      'Animals that are fast',
      'Jungle animals',
    ],
  },
  {
    id: 'food-medium',
    name: 'Food',
    difficulty: 'medium',
    prompts: [
      'Breakfast foods',
      'Desserts',
      'Foods that are crunchy',
      'Pizza toppings',
      'Things in a sandwich',
      'Foods you eat cold',
      'Fruits',
      'Snacks',
      'Foods from Italy',
      'Things you drink',
    ],
  },
  {
    id: 'popculture-hard',
    name: 'Pop Culture',
    difficulty: 'hard',
    prompts: [
      'Disney movies',
      'Superheroes',
      'Video games',
      'Cartoon characters',
      'Famous singers',
      'Movies with animals',
      'Things in Harry Potter',
      'Things in Star Wars',
      'Famous athletes',
      'TV shows for kids',
    ],
  },
];

// ============================================
// Utility Types
// ============================================

export interface GameAction {
  type: string;
  playerId: string;
  payload: unknown;
  timestamp: Date;
}

export interface GameEvent {
  type: 'player_joined' | 'player_left' | 'round_start' | 'round_end' | 'game_end' | 'answer_submitted';
  data: unknown;
  timestamp: Date;
}

// Avatar colors for players
export const PLAYER_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

// Fun player name suggestions
export const PLAYER_NAMES = [
  'Cosmic Cat',
  'Thunder Panda',
  'Sparkle Fox',
  'Rocket Rabbit',
  'Ninja Narwhal',
  'Electric Eel',
  'Bouncy Bear',
  'Zippy Zebra',
  'Mega Monkey',
  'Super Sloth',
  'Jolly Jellyfish',
  'Dancing Dolphin',
];

// ============================================
// Helper Functions
// ============================================

export function getRandomPrompt(prompts: PromptCategory[], difficulty?: Difficulty): string {
  const filtered = difficulty
    ? prompts.filter(p => p.difficulty === difficulty)
    : prompts;

  const category = filtered[Math.floor(Math.random() * filtered.length)];
  return category.prompts[Math.floor(Math.random() * category.prompts.length)];
}

export function getRandomPlayerName(): string {
  return PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
}

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

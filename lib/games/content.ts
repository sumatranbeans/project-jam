// Game content - prompts, words, categories, and questions

// Doodle Detective words by difficulty
export const DOODLE_WORDS = {
  easy: [
    // Animals
    'cat', 'dog', 'fish', 'bird', 'snake', 'frog', 'bee', 'pig', 'cow', 'duck',
    // Objects
    'sun', 'moon', 'star', 'tree', 'house', 'car', 'ball', 'hat', 'cup', 'book',
    // Food
    'apple', 'pizza', 'cake', 'ice cream', 'banana', 'cookie', 'egg', 'bread',
    // Simple actions/things
    'rain', 'fire', 'boat', 'plane', 'train', 'bike', 'door', 'bed', 'lamp'
  ],
  medium: [
    // Animals
    'elephant', 'giraffe', 'penguin', 'butterfly', 'octopus', 'dolphin', 'kangaroo',
    // Objects
    'umbrella', 'guitar', 'telescope', 'lighthouse', 'skateboard', 'ladder', 'anchor',
    // Places
    'castle', 'volcano', 'waterfall', 'rainbow', 'desert', 'island', 'bridge',
    // Actions
    'dancing', 'sleeping', 'cooking', 'swimming', 'flying', 'climbing', 'surfing',
    // Concepts
    'birthday', 'campfire', 'sunrise', 'snowman', 'treasure', 'pirate', 'astronaut'
  ],
  hard: [
    // Abstract
    'happiness', 'freedom', 'confusion', 'gravity', 'time', 'music', 'dream',
    // Complex scenes
    'rush hour', 'birthday party', 'space station', 'treasure hunt', 'magic show',
    // Phrases
    'raining cats and dogs', 'piece of cake', 'under the weather', 'break a leg',
    // Challenging
    'electricity', 'invisible', 'echo', 'shadow', 'reflection', 'imagination'
  ]
}

// Story Stacker themes
export const STORY_THEMES = [
  'A day at school that went completely wrong...',
  'The family pet has a secret life when no one is watching...',
  'A kid discovers a magical door in their closet...',
  'The strangest birthday party in history...',
  'An alien visits Earth for the first time...',
  'The toys come alive at midnight...',
  'A cooking competition with unexpected ingredients...',
  'The most unusual zoo in the world...',
  'A time machine that only goes back 10 minutes...',
  'The day gravity stopped working...',
  'A detective solves a mystery at a candy factory...',
  'The world record for the silliest thing ever...',
  'A superhero with the most useless power...',
  'The haunted house that just wanted friends...',
  'A robot tries to understand human holidays...'
]

// Story starter sentences
export const STORY_STARTERS = [
  'It was a perfectly ordinary Tuesday until',
  'Nobody believed what happened next, but',
  'The letter arrived at exactly midnight and read:',
  'When I woke up, everything was upside down because',
  'The old map led to a place where',
  'Everyone ran when they saw the',
  'The invention worked perfectly, except for one tiny problem:',
  'In the kingdom of Silly Things, the ruler announced:',
  'The spaceship landed in the backyard, and out came',
  'Legend says that whoever finds the golden key will'
]

// Emoji Telepathy prompts
export const EMOJI_PROMPTS = [
  // Simple concepts
  'Summer vacation', 'Birthday party', 'Rainy day', 'School morning', 'Movie night',
  'Best friend', 'Scary moment', 'Delicious meal', 'Perfect weekend', 'Monday morning',
  // Activities
  'Going to the beach', 'Playing video games', 'Reading a book', 'Eating breakfast',
  'Watching a sunset', 'Having a sleepover', 'Going to a concert', 'Building something',
  // Feelings
  'Feeling excited', 'Being nervous', 'Pure joy', 'Feeling cozy', 'Being surprised',
  // Places
  'The jungle', 'Outer space', 'The ocean', 'A magical forest', 'A busy city',
  // Things
  'The perfect pet', 'A delicious dessert', 'The coolest vehicle', 'A fun sport',
  // Scenarios
  'A day without electricity', 'Meeting your hero', 'Winning a prize',
  'The funniest thing ever', 'A perfect day', 'An adventure', 'A mystery'
]

// Common emojis for Emoji Telepathy (curated for family-friendly fun)
export const EMOJI_PALETTE = [
  // Faces
  '😀', '😂', '🥰', '😎', '🤔', '😱', '🤩', '😴', '🤯', '🥳',
  // Animals
  '🐶', '🐱', '🦁', '🐸', '🦋', '🐙', '🦄', '🐬', '🦖', '🐝',
  // Nature
  '🌞', '🌙', '⭐', '🌈', '🔥', '💧', '🌊', '🌸', '🌴', '❄️',
  // Food
  '🍕', '🍎', '🍦', '🎂', '🍪', '🌮', '🍔', '🍿', '☕', '🍩',
  // Activities
  '⚽', '🎮', '🎨', '🎵', '📚', '✈️', '🚀', '🏖️', '🎪', '🎬',
  // Objects
  '💎', '🎁', '🏆', '💡', '🔮', '🎈', '🎭', '👑', '🗝️', '🧩',
  // Hearts/symbols
  '❤️', '💖', '⚡', '✨', '💫', '🌟', '💯', '🎯', '🔥', '💥'
]

// Bluff Master questions with real answers
export const BLUFF_QUESTIONS = {
  easy: [
    { q: 'What is the largest animal on Earth?', a: 'Blue whale' },
    { q: 'How many legs does a spider have?', a: 'Eight' },
    { q: 'What color do you get when you mix red and yellow?', a: 'Orange' },
    { q: 'What is the closest star to Earth?', a: 'The Sun' },
    { q: 'How many days are in a week?', a: 'Seven' },
    { q: 'What do bees make?', a: 'Honey' },
    { q: 'What is frozen water called?', a: 'Ice' },
    { q: 'How many continents are there?', a: 'Seven' },
    { q: 'What is the largest ocean on Earth?', a: 'Pacific Ocean' },
    { q: 'What animal is known as the King of the Jungle?', a: 'Lion' }
  ],
  medium: [
    { q: 'What is the capital of Japan?', a: 'Tokyo' },
    { q: 'How many bones are in the human body?', a: '206' },
    { q: 'What planet is known as the Red Planet?', a: 'Mars' },
    { q: 'Who painted the Mona Lisa?', a: 'Leonardo da Vinci' },
    { q: 'What is the fastest land animal?', a: 'Cheetah' },
    { q: 'How many teeth does an adult human have?', a: '32' },
    { q: 'What is the smallest country in the world?', a: 'Vatican City' },
    { q: 'What language has the most native speakers?', a: 'Mandarin Chinese' },
    { q: 'What year did humans first land on the moon?', a: '1969' },
    { q: 'How many players are on a soccer team?', a: '11' }
  ],
  hard: [
    { q: 'What is the chemical symbol for gold?', a: 'Au' },
    { q: 'What is the deepest ocean trench called?', a: 'Mariana Trench' },
    { q: 'Who invented the telephone?', a: 'Alexander Graham Bell' },
    { q: 'What is the largest desert in the world?', a: 'Antarctic Desert' },
    { q: 'How many elements are in the periodic table?', a: '118' },
    { q: 'What is the speed of light in km per second?', a: 'About 300,000' },
    { q: 'What is the longest river in the world?', a: 'Nile River' },
    { q: 'Who wrote Romeo and Juliet?', a: 'William Shakespeare' },
    { q: 'What year was the first iPhone released?', a: '2007' },
    { q: 'How many hearts does an octopus have?', a: 'Three' }
  ]
}

// Category Clash categories
export const CLASH_CATEGORIES = [
  // Easy
  'A fruit',
  'A color',
  'An animal',
  'Something in a kitchen',
  'A type of food',
  'Something you wear',
  'A sport',
  'A vehicle',
  'Something at school',
  'A toy',
  // Medium
  'A superhero',
  'Something cold',
  'A job people do',
  'Something that flies',
  'A holiday',
  'A movie character',
  'Something sweet',
  'A musical instrument',
  'Something you do on vacation',
  'A type of weather',
  // Creative
  'Something a wizard would have',
  'Something in a video game',
  'The worst pizza topping',
  'A silly name for a pet',
  'Something you would find on Mars',
  'The best superpower',
  'Something a robot would say',
  'A funny excuse for being late',
  'Something that would be weird if it could talk',
  'The strangest animal'
]

// Helper functions

export function getRandomWord(difficulty: 'easy' | 'medium' | 'hard'): string {
  const words = DOODLE_WORDS[difficulty]
  return words[Math.floor(Math.random() * words.length)]
}

export function getRandomTheme(): string {
  return STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)]
}

export function getRandomStarter(): string {
  return STORY_STARTERS[Math.floor(Math.random() * STORY_STARTERS.length)]
}

export function getRandomEmojiPrompt(): string {
  return EMOJI_PROMPTS[Math.floor(Math.random() * EMOJI_PROMPTS.length)]
}

export function getRandomBluffQuestion(difficulty: 'easy' | 'medium' | 'hard'): { q: string; a: string } {
  const questions = BLUFF_QUESTIONS[difficulty]
  return questions[Math.floor(Math.random() * questions.length)]
}

export function getRandomCategory(): string {
  return CLASH_CATEGORIES[Math.floor(Math.random() * CLASH_CATEGORIES.length)]
}

// Get multiple unique items
export function getUniqueRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

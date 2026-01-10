# Project Jam: Visual Mockup Specifications
## UI/UX Design Reference

*Visual specifications for all 7 game concepts with AI image generation prompts*

---

## Design System Overview

### Color Palette

```
Primary Colors:
├── Vibrant Orange: #FF6B35 (energy, excitement)
├── Electric Blue: #4ECDC4 (calm, trustworthy)
├── Sunshine Yellow: #FFE66D (joy, playfulness)
├── Soft Purple: #9B5DE5 (creativity, magic)
└── Coral Pink: #F15BB5 (warmth, friendliness)

Neutral Colors:
├── Deep Navy: #1A1A2E (backgrounds)
├── Soft Gray: #E8E8E8 (cards, surfaces)
└── Pure White: #FFFFFF (text on dark)

Status Colors:
├── Success Green: #06D6A0 (correct, go)
├── Warning Amber: #FFD166 (caution, timer)
└── Error Red: #EF476F (wrong, stop)
```

### Typography

```
Headings: Rounded, playful sans-serif (like Nunito, Quicksand)
Body: Clean, readable sans-serif (like Inter, Open Sans)
Numbers: Monospace for scores/timers (like Space Mono)
```

### Design Principles

1. **Large touch targets** - Minimum 48px for phone buttons
2. **High contrast** - Text always readable against background
3. **Playful but clean** - Fun without being cluttered
4. **Consistent iconography** - Lucide or similar rounded icons
5. **Smooth animations** - Bouncy, satisfying micro-interactions

---

# Game 1: Blurt!

## TV Screen Mockup

### Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│ [HEADER BAR - 80px]                                         │
│ Logo left | Round counter center | Timer right              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    [WORD CARD - 400px]                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │   SECRET WORD (large, 72px)                         │   │
│  │                                                      │   │
│  │   ─────────────────────────────────                 │   │
│  │                                                      │   │
│  │   ❌ forbidden1    ❌ forbidden2                    │   │
│  │   ❌ forbidden3    ❌ forbidden4                    │   │
│  │   ❌ forbidden5    ❌ forbidden6                    │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [SCOREBOARD - 120px]                                        │
│ Team Blue: ██████░░░░ 6pts | Team Orange: ████░░░░░░ 4pts  │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV Screen)

```
A clean, modern game show interface displayed on a smart TV.
Bright orange and blue color scheme with rounded corners.
Center shows a large white card with the word "PIZZA" in bold
playful typography. Below it, 6 forbidden words displayed with
red X marks: cheese, Italian, slice, toppings, round, delivery.
A circular countdown timer (45 seconds) glows in the corner.
Two team score bars at the bottom. Minimalist, family-friendly,
vibrant but not overwhelming. High resolution, flat design.
```

## Phone Screen Mockup

### Layout Specification

```
┌─────────────────────────┐
│ [STATUS BAR - 60px]     │
│ "You're describing!"     │
├─────────────────────────┤
│                         │
│ [WORD DISPLAY - 120px]  │
│                         │
│ 🎯 PIZZA               │
│                         │
├─────────────────────────┤
│ [FORBIDDEN LIST]        │
│                         │
│ ❌ cheese               │
│ ❌ Italian              │
│ ❌ slice                │
│ ❌ toppings             │
│ ❌ round                │
│ ❌ delivery             │
│                         │
├─────────────────────────┤
│ [ACTION BUTTONS]        │
│                         │
│ ┌───────────────────┐   │
│ │ 🔴 BUZZ! (I said  │   │
│ │    a forbidden    │   │
│ │    word)          │   │
│ └───────────────────┘   │
│                         │
│ ┌───────────────────┐   │
│ │ ✅ GOT IT! (They  │   │
│ │    guessed right) │   │
│ └───────────────────┘   │
│                         │
└─────────────────────────┘
```

### AI Image Prompt (Phone Screen)

```
A mobile phone screen showing a party game interface.
Clean white background with vibrant accent colors.
The word "PIZZA" displayed prominently at top with a target
icon. Below, a vertical list of 6 forbidden words each with
a red X icon. Two large buttons at the bottom: a red "BUZZ"
button and a green "GOT IT" button. Rounded corners, large
touch-friendly buttons, playful typography. iPhone-style UI
but platform neutral. Minimal, joyful design.
```

---

# Game 2: Scribble Showdown

## TV Screen Mockup (Drawing Phase)

### Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│ SCRIBBLE SHOWDOWN                        ⏱️ 0:20           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐  │
│   │  ✏️       │ │  ✏️       │ │  ✏️       │ │  ✏️       │  │
│   │ Player 1  │ │ Player 2  │ │ Player 3  │ │ Player 4  │  │
│   │           │ │           │ │           │ │           │  │
│   │ [Avatar]  │ │ [Avatar]  │ │ [Avatar]  │ │ [Avatar]  │  │
│   │           │ │           │ │           │ │           │  │
│   │ Drawing...│ │ Drawing...│ │ Drawing...│ │ Drawing...│  │
│   └───────────┘ └───────────┘ └───────────┘ └───────────┘  │
│                                                             │
│                  Everyone's drawing: 🔒 SECRET              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## TV Screen Mockup (Guessing Phase)

```
┌─────────────────────────────────────────────────────────────┐
│ SCRIBBLE SHOWDOWN                        ⏱️ 0:15           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │                                                      │   │
│   │              [PLAYER 2's DRAWING]                   │   │
│   │                                                      │   │
│   │                 (Large display)                     │   │
│   │                                                      │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│         Drawn by: Sarah 🎨      What is it?                │
│                                                             │
│    Guessed: ✅ P1  ✅ P3  ⏳ P4              ⏱️ 0:10      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV - Guessing)

```
A smart TV displaying a drawing guessing game. The screen
shows a child's playful drawing of an elephant (simple lines,
recognizable but imperfect) on a white canvas taking up most
of the screen. Below the drawing, colorful player avatars
show who has guessed with checkmarks. A timer counts down in
the corner. Bright, cheerful interface with purple and yellow
accents. Game show aesthetic but friendly and accessible.
Modern flat design with subtle shadows.
```

## Phone Screen Mockup (Drawing Canvas)

```
┌─────────────────────────┐
│ Draw: ELEPHANT          │
│ ⏱️ 0:15                 │
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │                     │ │
│ │                     │ │
│ │     [CANVAS]        │ │
│ │                     │ │
│ │                     │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ Brush: ○━━━━━━━●━━━━━○ │
│       thin      thick   │
│                         │
│ ⚫ 🔴 🟠 🟡 🟢 🔵 🟣 ⚪ │
│                         │
│ [↩️ Undo]    [🗑️ Clear] │
│                         │
└─────────────────────────┘
```

### AI Image Prompt (Phone - Drawing)

```
A mobile drawing app interface optimized for a party game.
White canvas takes up 60% of the screen. Below it, a brush
size slider and a row of 8 color circles (rainbow palette).
At the bottom, undo and clear buttons. The word "ELEPHANT"
displayed at top with a timer. Clean, minimal interface with
large touch targets. Someone has started drawing a simple
elephant on the canvas. Playful, accessible design similar
to Draw Something or Pictionary mobile games.
```

---

# Game 3: Fib Detector

## TV Screen Mockup (Voting Phase)

### Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│ FIB DETECTOR 🔍                           Round 3/5         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         "What's your favorite pizza topping?"               │
│                                                             │
│    ┌──────────────────────────────────────────────────┐    │
│    │                                                   │    │
│    │   A)  Pepperoni                                  │    │
│    │                                                   │    │
│    │   B)  Mushrooms                                  │    │
│    │                                                   │    │
│    │   C)  Pineapple                                  │    │
│    │                                                   │    │
│    │   D)  Anchovies                                  │    │
│    │                                                   │    │
│    │   E)  Extra cheese                               │    │
│    │                                                   │    │
│    └──────────────────────────────────────────────────┘    │
│                                                             │
│              🔍 Which answer is the FIB?                   │
│                                                             │
│         Votes submitted: 3/5           ⏱️ 0:20             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV - Voting)

```
A game show style TV interface for a social deduction game.
The screen shows a question "What's your favorite pizza
topping?" in a stylized banner at top. Below, 5 answer options
(A through E) displayed as cards in a vertical list, each
with a different topping name. The design uses a detective
theme with magnifying glass icons and purple/gold color
scheme. A large "Which is the FIB?" prompt at bottom. Modern,
polished interface like a professional party game. Mysterious
but fun atmosphere with soft shadows and elegant typography.
```

## TV Screen Mockup (Reveal Phase)

```
┌─────────────────────────────────────────────────────────────┐
│ FIB DETECTOR 🔍                           REVEAL!           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    THE FIB WAS...                          │
│                                                             │
│                 ┌─────────────────────┐                    │
│                 │                      │                    │
│                 │   D) ANCHOVIES      │                    │
│                 │                      │                    │
│                 │   Submitted by:      │                    │
│                 │   🎭 SARAH          │                    │
│                 │                      │                    │
│                 └─────────────────────┘                    │
│                                                             │
│    Who was fooled:                                         │
│    ❌ Mom (voted B)  ❌ Dad (voted B)  ✅ Jake (got it!)   │
│                                                             │
│    Points: Sarah +2 (fooled 2) | Jake +2 (caught fib)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV - Reveal)

```
Dramatic reveal screen for a party game. Center shows a
glowing card with "ANCHOVIES" as the revealed fake answer.
Below it, a player's avatar (Sarah) shown with a mischievous
theatrical mask icon indicating they were the fibber. The
background has subtle confetti or spotlight effects. Below,
icons show which players were fooled (red X) and who caught
the fib (green check). Points being awarded shown at bottom.
Exciting, game-show reveal moment aesthetic with gold and
purple colors. Celebratory but not overwhelming.
```

---

# Game 4: Number Crunch

## TV Screen Mockup

### Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│ NUMBER CRUNCH                              ⏱️ 0:30         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────┐                         │
│                    │   TARGET    │                         │
│                    │             │                         │
│                    │     24      │                         │
│                    │             │                         │
│                    └─────────────┘                         │
│                                                             │
│          ┌─────────────────────────────────┐               │
│          │                                  │               │
│          │      8     3     2     5        │               │
│          │                                  │               │
│          │      +     -     ×     ÷        │               │
│          │                                  │               │
│          └─────────────────────────────────┘               │
│                                                             │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│   │ 🟢 Dad     │ │ ⏳ Mom      │ │ 🟢 Emma    │         │
│   │  LOCKED!   │ │  thinking   │ │  LOCKED!   │         │
│   └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV Screen)

```
A math puzzle game interface on a TV screen. Dominant element
is a large glowing target number "24" displayed in a circular
badge at the center top. Below it, four number tiles (8, 3,
2, 5) and four operation symbols (+, -, ×, ÷) arranged in a
calculator-like grid. The design uses electric blue and
yellow colors with a digital/arcade aesthetic. At bottom,
player status indicators show who has "locked in" their
answer. Clean, modern interface with subtle neon glow effects.
Educational but exciting, like a game show math challenge.
```

## Phone Screen Mockup

```
┌─────────────────────────┐
│    TARGET: 24           │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │  8 × 3 = 24 ✓    │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  ┌─────┐ ┌─────┐       │
│  │  8  │ │  3  │       │
│  └─────┘ └─────┘       │
│  ┌─────┐ ┌─────┐       │
│  │  2  │ │  5  │       │
│  └─────┘ └─────┘       │
│                         │
│  ┌───┐┌───┐┌───┐┌───┐  │
│  │ + ││ - ││ × ││ ÷ │  │
│  └───┘└───┘└───┘└───┘  │
│                         │
│  [Clear] [Undo] [( )]  │
│                         │
│  ┌───────────────────┐  │
│  │   🔒 LOCK IN!     │  │
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

### AI Image Prompt (Phone Screen)

```
A mobile calculator-style game interface. At top, "TARGET: 24"
displayed prominently. Below, an equation display area showing
"8 × 3 = 24" with a green checkmark indicating correct answer.
Four number buttons (8, 3, 2, 5) arranged in a 2x2 grid, each
as a large rounded square. Below that, four operation buttons
in a row (+, -, ×, ÷). At bottom, utility buttons (Clear, Undo,
Parentheses) and a prominent "LOCK IN" button. Blue and white
color scheme with orange accents. Large touch-friendly buttons,
clean mathematical aesthetic. Like a fun educational app.
```

---

# Game 5: Globe Trotter

## TV Screen Mockup (Zoomed View)

### Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│ GLOBE TROTTER 🌍                           ⏱️ 0:20         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │                                                      │   │
│   │                                                      │   │
│   │         [ZOOMED-IN PHOTO OF LANDMARK]               │   │
│   │                                                      │   │
│   │                                                      │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   Zoom Level: ■■■□□ (3/5)              Points: 70          │
│                                                             │
│   🔍 Need a hint? Zoom out! (costs 30 pts)                │
│                                                             │
│   Guessed: ✓ Mom  ⏳ Dad  ⏳ Emma  ⏳ Jake                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV - Zoomed Landmark)

```
A geography guessing game interface. The main area shows a
tightly cropped, zoomed-in photograph of a famous landmark -
just the distinctive metal lattice work of the Eiffel Tower,
not immediately recognizable. The photo is framed with a
stylized border. Below, a zoom level indicator (5 dots, 3
filled), current point value (70 pts), and a hint button.
At bottom, player status avatars showing who has guessed.
Travel/adventure theme with map textures in the background.
Blue and gold color scheme. Sleek, modern interface like a
premium trivia app.
```

## TV Screen Mockup (Revealed)

```
┌─────────────────────────────────────────────────────────────┐
│ GLOBE TROTTER 🌍                           REVEALED!        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                      │   │
│   │                                                      │   │
│   │      [FULL PHOTO OF EIFFEL TOWER]                   │   │
│   │                                                      │   │
│   │                                                      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│                   EIFFEL TOWER                             │
│                   Paris, France 🇫🇷                         │
│                                                             │
│   Fun fact: Construction used 7,300 tons of iron and       │
│   took 2 years, 2 months, and 5 days to complete!         │
│                                                             │
│   Points: Mom +70  Dad +40  Emma +70  Jake +25            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV - Revealed)

```
A triumphant reveal screen for a geography game. Shows a
beautiful full photograph of the Eiffel Tower against a blue
sky. Below the image, the answer is displayed: "EIFFEL TOWER"
in large text, with "Paris, France" and a French flag emoji.
A fun fact appears in an elegant info card. At bottom, point
awards for each player. The design has a travel magazine
aesthetic with warm, inviting colors. Celebration elements
like subtle sparkles or a "REVEALED!" banner. Educational
and exciting simultaneously.
```

---

# Game 6: Word Bridge

## TV Screen Mockup

### Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│ WORD BRIDGE                                 ⏱️ 0:45        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     START                                          END      │
│    ┌──────┐                                    ┌──────┐    │
│    │ COLD │                                    │  HOT │    │
│    └──────┘                                    └──────┘    │
│                                                             │
│                    THE BRIDGE                              │
│                                                             │
│    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐           │
│    │ COLD │ ━━▶│ ICE  │ ━━▶│ MELT │ ━━▶│  ?   │ ━━▶ HOT  │
│    └──────┘    └──────┘    └──────┘    └──────┘           │
│       │           │           │                            │
│      Start       Dad        Emma      (Jake's turn!)       │
│                                                             │
│                                                             │
│              👤 JAKE - Your turn to add a word!            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV Screen)

```
A cooperative word game interface showing a word chain being
built. At the left, a word tile "COLD" (starting word) and at
the right "HOT" (goal word). Between them, a visual bridge
metaphor with stepping stones - each stone is a word tile.
Currently shows: COLD → ICE → MELT → ? with arrows connecting.
Player names appear below each word they contributed. The
current player "Jake" is highlighted at bottom. Warm, friendly
colors (oranges, teals) with a bridge/pathway visual motif.
Cooperative, encouraging atmosphere. Clean modern design with
playful elements like a cartoon bridge in the background.
```

## Phone Screen Mockup (Active Player)

```
┌─────────────────────────┐
│                         │
│   YOUR TURN! 🌉         │
│                         │
│   The bridge so far:    │
│                         │
│   COLD → ICE → MELT → ?│
│                         │
│   ─────────────────     │
│                         │
│   Goal: Reach HOT       │
│                         │
│   Your word:            │
│  ┌───────────────────┐  │
│  │ FIRE              │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   Submit Word     │  │
│  └───────────────────┘  │
│                         │
│   ⏱️ 0:08               │
│   (your turn timer)     │
│                         │
└─────────────────────────┘
```

### AI Image Prompt (Phone Screen)

```
A mobile interface for a word association game. At top,
"YOUR TURN!" with a bridge emoji. The word chain so far is
displayed: COLD → ICE → MELT → ? showing the path. Below,
"Goal: Reach HOT" as the target. A large text input field
shows the player typing "FIRE" as their next word. A blue
"Submit Word" button below. Timer shows 8 seconds remaining.
Clean, friendly design with encouraging colors (teal, coral).
The interface feels cooperative and supportive, not stressful.
Large text, easy to read at a glance.
```

---

# Game 7: Statue!

## TV Screen Mockup (Dance Phase)

### Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│ STATUE!                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                  ♪ ♫ ♪ DANCE! ♪ ♫ ♪                        │
│                                                             │
│                                                             │
│                 🕺 💃 🕺 💃 🕺                              │
│                                                             │
│                                                             │
│            Get moving! Music stops SOON...                  │
│                                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Dancers: Mom, Dad, Emma, Jake, Grandma              │   │
│  │ Observer: 👁️ Uncle Bob (watching!)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## TV Screen Mockup (Freeze Phase)

```
┌─────────────────────────────────────────────────────────────┐
│ STATUE!                                      ⏱️ 0:08       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                                                             │
│                   ❄️ F R E E Z E ❄️                        │
│                                                             │
│                                                             │
│                                                             │
│               Hold PERFECTLY still!                         │
│                                                             │
│                                                             │
│                                                             │
│           👁️ Uncle Bob is watching...                      │
│                                                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### AI Image Prompt (TV - Freeze)

```
A party game freeze screen displayed on a TV. Large text
"FREEZE" with snowflake emojis on either side, displayed in
icy blue colors against a dark background. The text has a
frozen/crystalline effect. Below, "Hold PERFECTLY still!"
in smaller text. A countdown timer shows 8 seconds remaining.
An eye icon with "Uncle Bob is watching..." creates tension.
The overall aesthetic is dramatic and exciting, like a
freeze-frame moment in a dance competition. Cool blue and
white color scheme with subtle frost effects at the edges.
```

## Phone Screen Mockup (Observer)

```
┌─────────────────────────┐
│                         │
│   👁️ YOU'RE THE         │
│      OBSERVER           │
│                         │
│   The statues are       │
│   frozen! Who moved?    │
│                         │
│   ┌─────────────────┐   │
│   │ ○ Mom           │   │
│   ├─────────────────┤   │
│   │ ○ Dad           │   │
│   ├─────────────────┤   │
│   │ ● Emma ← MOVED! │   │
│   ├─────────────────┤   │
│   │ ○ Jake          │   │
│   ├─────────────────┤   │
│   │ ○ Grandma       │   │
│   └─────────────────┘   │
│                         │
│  ┌───────────────────┐  │
│  │ Nobody moved!     │  │
│  └───────────────────┘  │
│                         │
│   ⏱️ 0:05 to decide    │
│                         │
└─────────────────────────┘
```

### AI Image Prompt (Phone - Observer)

```
A mobile interface for a party game observer role. At top,
an eye icon with "YOU'RE THE OBSERVER" in bold text. Below,
the prompt "Who moved?" A list of 5 player names (Mom, Dad,
Emma, Jake, Grandma) each in a selectable row - one is
selected/highlighted (Emma) with "MOVED!" indicator. At
bottom, a "Nobody moved!" button for when everyone stayed
still. A countdown timer (5 seconds) creates urgency. The
design uses a spy/detective theme with dark purple and gold
colors. Tappable elements are clearly indicated. Suspenseful
but fun aesthetic.
```

---

# Component Library Reference

## Shared UI Components

### Timer Component

```
┌─────────────────────┐
│      ⏱️ 0:45       │
│   ━━━━━━━━━━━━━━   │
│   (progress bar)    │
└─────────────────────┘
```
- Circular or linear timer
- Color changes: Green → Yellow → Red as time decreases
- Pulse animation in final 5 seconds
- Audio cue capability (for future)

### Player Avatar Component

```
┌─────────────────────┐
│   ┌───────┐        │
│   │ 😊    │ Sarah   │
│   │       │ 45 pts  │
│   └───────┘        │
│   ⏳ waiting        │
└─────────────────────┘
```
- Customizable avatar (emoji or image)
- Player name
- Score display
- Status indicator (thinking, locked in, ready, etc.)

### Word Card Component

```
┌─────────────────────┐
│                     │
│   ┌─────────────┐   │
│   │             │   │
│   │   PIZZA     │   │
│   │             │   │
│   └─────────────┘   │
│                     │
└─────────────────────┘
```
- White/colored card background
- Large, readable text
- Shadow for depth
- Can include icons or emojis

### Button Styles

```
Primary:   [█████████████] - Solid color, high emphasis
Secondary: [░░░░░░░░░░░░░] - Outlined, medium emphasis
Danger:    [▓▓▓ BUZZ! ▓▓▓] - Red, for negative actions
Success:   [▓▓▓ GOT IT ▓▓▓] - Green, for positive actions
```

---

# Animation Guidelines

## Micro-Interactions

| Element | Animation | Duration |
|---------|-----------|----------|
| Button press | Scale down 95%, slight shadow reduction | 100ms |
| Card appear | Slide up + fade in | 200ms |
| Score change | Number counting up with bounce | 300ms |
| Timer warning | Pulse glow | 500ms loop |
| Correct answer | Confetti burst + checkmark | 500ms |
| Wrong answer | Shake + red flash | 300ms |

## Transitions

| Transition | Animation | Duration |
|------------|-----------|----------|
| Phase change | Fade through black | 400ms |
| Player turn | Spotlight effect | 300ms |
| Reveal moment | Zoom + flash | 500ms |
| Game end | Celebration overlay | 1000ms |

---

# Responsive Breakpoints

## TV/Large Screen (1920x1080)
- Full layout with all elements visible
- Large fonts (32-72px for key elements)
- Comfortable spacing

## Tablet (1024x768)
- Slightly condensed layout
- Medium fonts (24-48px)

## Phone (375x812 - iPhone standard)
- Single column layout
- Touch-optimized buttons (min 48px height)
- Fonts (18-32px)
- Bottom-heavy UI (thumb zone)

---

*Document Version: 1.0*
*Created: January 10, 2026*
*Purpose: Design reference and AI image generation prompts*

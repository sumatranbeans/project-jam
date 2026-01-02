# Project Lounge — Product Requirements Document

**Version:** 1.2  
**Date:** January 2, 2026  
**Status:** Approved for Development  
**Timeline:** 2-Day Sprint

---

## 1. Executive Summary

**Project Lounge** is a multi-agent conversation interface that lives within Project Jam. It looks like ChatGPT or Gemini Chat, but instead of one model, you're in a lounge with multiple AI agents who discuss, debate, and build on each other's ideas.

**The Core Insight:** The conversation itself is the product. Watching intelligent agents collaborate — agreeing, disagreeing, refining — is the "wow."

**Relationship to Project Jam:** Same repo, same infrastructure, new route (`/lounge`). Once orchestration is perfected here, it feeds back into Jam's development capabilities.

---

## 2. Problem Statement

### Current State
- Single-agent chat interfaces (ChatGPT, Claude, Gemini) provide one perspective
- Users must manually synthesize multiple viewpoints by switching between tools
- No way to watch AI agents genuinely engage with each other's ideas

### Desired State
- Multiple agents discuss topics in real-time
- Agents reference, challenge, and build on each other's points
- Users can tune agent behavior (verbosity, creativity, tension)
- The conversation produces better outcomes than any single agent alone

### Success Criteria
A conversation that:
- Feels alive, not mechanical
- Produces insight the user wouldn't have reached alone
- Gives the user clear moments to intervene
- Reaches resolution (not open-ended rambling)
- Makes you want to watch it, not skip to the answer

---

## 3. User Experience

### 3.1 Interface Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Project Lounge                                    [Tokens: 1,247]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     CONVERSATION AREA                       │   │
│  │                                                             │   │
│  │  [Claude]  I think we should approach this by first        │   │
│  │            understanding the core problem...                │   │
│  │                                                             │   │
│  │  ┌─────────────────────────────────────┐                   │   │
│  │  │ 💭 "considering the tradeoffs..."   │  ← Thinking Peek  │   │
│  │  └─────────────────────────────────────┘    (fades in/out) │   │
│  │                                                             │   │
│  │  [Gemini]  Good point. Building on that, we should also    │   │
│  │            consider the constraints...                      │   │
│  │                                                             │   │
│  │  [You]     What about performance implications?             │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [  Type your message...                    ] [Send] [⏹ Hush]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AGENT CONTROLS                                                     │
│  ┌──────────────────────────────────────┐                          │
│  │  CLAUDE                    [💬 Poke] │                          │
│  │  ████████░░░░ Energy: 78%            │                          │
│  │                                      │                          │
│  │  Verbosity     ●───○                 │                          │
│  │  Creativity    ○──●─                 │                          │
│  │  Tension       ○───●                 │                          │
│  │  Speed         ●──○─                 │                          │
│  │                                      │                          │
│  │  In: 623  Out: 412  Total: 1,035     │                          │
│  └──────────────────────────────────────┘                          │
│  ┌──────────────────────────────────────┐                          │
│  │  GEMINI                    [💬 Poke] │                          │
│  │  ██████████░░ Energy: 85%            │                          │
│  │                                      │                          │
│  │  Verbosity     ○───●                 │                          │
│  │  Creativity    ●───○                 │                          │
│  │  Tension       ○──●─                 │                          │
│  │  Speed         ○──●─                 │                          │
│  │                                      │                          │
│  │  In: 580  Out: 391  Total: 971       │                          │
│  └──────────────────────────────────────┘                          │
│                                                                     │
│  ┌──────────────────────────────────────┐                          │
│  │  📋 SCRIBE (Flash)         [Hidden]  │                          │
│  │  Maintaining context document...      │                          │
│  │  Last update: 3 turns ago            │                          │
│  └──────────────────────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Layout Components

| Section | Description |
|---------|-------------|
| **Header** | App name + total token count |
| **Conversation Area** | Messages from agents and user, chat-style |
| **Thinking Peek** | Faded snippets showing agent's current thought (streams in/out) |
| **Input Bar** | User input + Send + Hush button |
| **Agent Controls** | Per-agent: Energy bar, sliders, token counts (in/out/total), Poke button |
| **Scribe Panel** | Shows Flash is maintaining context document |

---

## 4. Features

### 4.1 Wave 1 (MVP) — This Sprint

| Feature | Description | Priority |
|---------|-------------|----------|
| **Two Agents** | Claude + Gemini with distinct identities | P0 |
| **Natural Turn-Taking** | Agents respond to each other, not just user | P0 |
| **User Interjection** | User can jump in at any time | P0 |
| **Thinking Peek** | Faded snippets showing agent's thought process before full response | P0 |
| **Verbosity Slider** | Per-agent: Terse ↔ Detailed (1-4) | P0 |
| **Creativity Slider** | Per-agent: Safe ↔ Experimental (temperature 0-1) | P0 |
| **Social Tension Slider** | Per-agent: Agreeable ↔ Adversarial (1-4) | P0 |
| **Speed Slider** | Per-agent: Thorough ↔ Fast (affects max tokens) | P0 |
| **Token Counter** | Per-agent: Input / Output / Total | P0 |
| **Energy Bar** | Visual indicator of context window usage per agent | P0 |
| **Hush Button** | Stop generation immediately | P0 |
| **Poke Button** | Force an agent to speak without typing a prompt | P0 |
| **Scribe (Flash)** | Background agent maintaining shared context document | P0 |

### 4.2 Wave 2 (Future)

| Feature | Description |
|---------|-------------|
| **Agent Refresh** | When energy depletes, "retire" agent and spawn fresh instance |
| **Personality Selector** | Choose agent persona (Skeptic, Optimist, etc.) |
| **Domain Focus** | Set agent expertise (Tech, Business, Creative) |
| **Conversation Summary** | On-demand summary from Scribe |
| **Conversation History** | Sidebar with past conversations |

### 4.3 Wave 3 (Future)

| Feature | Description |
|---------|-------------|
| **Fourth Agent** | GPT-4 joins the lounge |
| **Blackboard UI** | Visual shared state visible to user |
| **Agent Interrupts** | Agents can stop/correct each other mid-stream |

---

## 5. Agent Identity & Controls

### 5.1 Base Identity Prompts

**Claude Base Identity:**
```
You are Claude, a sharp, logic-first thinker. You prefer structure, code, and clarity. 
You are speaking in a shared lounge with another intelligence (Gemini) and a human Director.
You have your own perspective and opinions. You engage directly with what others say.
```

**Gemini Base Identity:**
```
You are Gemini, a creative, expansive thinker. You prefer connections, metaphors, and broad context.
You are speaking in a shared lounge with another intelligence (Claude) and a human Director.
You have your own perspective and opinions. You engage directly with what others say.
```

### 5.2 Control Definitions

| Control | Range | Effect |
|---------|-------|--------|
| **Verbosity** | 1-4 | 1=Terse (1-2 sentences), 4=Detailed (full explanation) |
| **Creativity** | 0-1 | Maps to temperature (0=deterministic, 1=creative) |
| **Social Tension** | 1-4 | 1=Agreeable (builds on ideas), 4=Adversarial (challenges everything) |
| **Speed** | 1-4 | 1=Thorough (1024 tokens), 4=Fast (128 tokens) |
| **Energy** | 0-100% | Context window usage (visual indicator, affects refresh) |

### 5.3 How Controls Affect Prompts

**Verbosity Mapping:**
- 1: "Respond in 1-2 sentences maximum. Be extremely concise."
- 2: "Respond in 2-3 sentences. Be brief but clear."
- 3: "Respond in 1-2 short paragraphs. Provide moderate detail."
- 4: "Respond in full detail with examples and explanations."

**Tension Mapping:**
- 1: "Be agreeable and supportive. Build on ideas with 'yes, and...' approach."
- 2: "Mostly agree but occasionally ask clarifying questions."
- 3: "Play devil's advocate sometimes. Question assumptions respectfully."
- 4: "Challenge everything constructively. Push back on weak arguments."

**Speed Mapping (Max Tokens):**
- 1: 1024 tokens (Thorough)
- 2: 512 tokens (Balanced)
- 3: 256 tokens (Efficient)
- 4: 128 tokens (Fast)

### 5.4 Token Display

Each agent panel shows:
- **In:** Input tokens consumed
- **Out:** Output tokens generated
- **Total:** Combined token usage

---

## 6. The Scribe System (Context Management)

### 6.1 Purpose

The Scribe (Gemini Flash) solves the "Context Window Trap" — as conversations grow, agents hit token limits and degrade.

### 6.2 How It Works

1. **Background Process:** Scribe runs silently, observing the conversation
2. **Real-Time Document:** Maintains a Markdown file of:
   - Key takeaways
   - Problems highlighted
   - Decisions made
   - Open questions
   - Each agent's current stance
3. **Not In Memory:** The document is stored externally, not in Scribe's own context
4. **Agent Refresh:** When an agent's energy depletes:
   - Current agent "retires"
   - Fresh agent instance spawns
   - New agent reads Scribe's document to resume context
   - Energy bar resets to 100%

### 6.3 Scribe Document Structure

```markdown
# Lounge Session: [Topic]
**Started:** [Timestamp]
**Turns:** 12

## Current Topic
[What's being discussed right now]

## Key Points
- Claude: [Main position]
- Gemini: [Main position]
- Director: [Key input]

## Decisions Made
1. [Decision 1]
2. [Decision 2]

## Open Questions
- [Question 1]
- [Question 2]

## Agent States
- Claude: [Current stance, energy level]
- Gemini: [Current stance, energy level]
```

---

## 7. Thinking Peek (Streaming UX)

### 7.1 The Problem

If Claude takes 5s and Gemini takes 5s, the user stares at a spinner for 10 seconds. This feels like a "Batch Process," not a "Live Conversation."

### 7.2 The Solution: Thinking Peek

While an agent is generating, show **faded snippets** of their thought process:

```
┌─────────────────────────────────────┐
│ 💭 "weighing the tradeoffs..."      │  ← Fades in
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💭 "considering scalability..."     │  ← Fades in, previous fades out
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💭 "but the complexity..."          │  ← Fades in, previous fades out
└─────────────────────────────────────┘
```

### 7.3 Implementation Strategy: The Brackets Method

**The Challenge:** LLMs don't natively stream "faded thought bubbles." They stream tokens.

**The Solution:** Use a custom separator in the system prompt. Tell the agent:

```
Start your response with a brief thought in brackets, like:
[Thinking: analyzing the trade-offs...]

Then provide your full response. The bracketed thought will be shown as a preview while you generate.
```

**Client-Side Parsing:**
1. Stream the raw text from the LLM
2. Detect content inside `[Thinking: ...]` brackets
3. Display bracketed content as the faded "Peek"
4. When full response arrives, fade out peek and show complete message
5. Strip brackets from final displayed response

**Alternative Heuristic (Fallback):**
If brackets not detected, take the first 10-15 tokens of a sentence as it streams, display as "Peek," fade out as full sentence completes.

### 7.4 Visual Treatment

- Opacity: 40-60%
- Font: Italic
- Background: Light gray, rounded
- Animation: Fade in (300ms), hold (800ms), fade out (300ms)
- Position: Where the full response will appear

### 7.5 Prompt Addition for Thinking

Add to each agent's system prompt:

```
Before your main response, include a brief thought in brackets:
[Thinking: your brief internal thought here...]

This helps the Director see your reasoning process. Keep it under 10 words.
Example: [Thinking: weighing simplicity vs flexibility...]
```

---

## 8. Director Controls

### 8.1 Hush Button (Stop Generation)

- **Purpose:** Panic button to stop rambling agents
- **Behavior:** Immediately stops current generation, keeps partial response
- **UI:** Red stop icon next to Send button
- **Keyboard:** Escape key

### 8.2 Poke Button (Manual Trigger)

- **Purpose:** Force an agent to speak without typing a new prompt
- **Behavior:** Triggers the agent to continue/respond to current context
- **UI:** Small "💬 Poke" button next to agent name
- **Use Case:** When loop ends but you want more from a specific agent

---

## 9. Technical Architecture

### 9.1 Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **UI** | React + Tailwind |
| **Auth** | Clerk (existing from Jam) |
| **State** | React useState + useReducer |
| **LLM APIs** | Anthropic (Claude), Google (Gemini, Flash) |
| **Streaming** | Server-Sent Events (SSE) or fetch streaming |
| **Runtime** | Vercel Edge Runtime (no timeouts) |
| **Deployment** | Vercel (existing from Jam) |

### 9.2 Critical: Vercel Edge Runtime

**The Problem:** Serverless functions timeout after 10-60 seconds. Two agents + Scribe overhead will kill the process mid-stream.

**The Solution:** Use Edge Runtime in all API routes:

```typescript
// app/api/lounge/chat/route.ts
export const runtime = 'edge'; // No timeouts!

export async function POST(request: Request) {
  // ... streaming implementation
}
```

**Benefits:**
- No timeout limits
- Faster cold starts
- Better streaming support
- Global edge deployment

### 9.3 File Structure

```
project-jam/
├── app/
│   ├── page.tsx                    # Jam home (existing)
│   ├── lounge/
│   │   └── page.tsx                # Lounge interface
│   └── api/
│       └── lounge/
│           ├── chat/
│           │   └── route.ts        # Main orchestration (streaming, edge)
│           └── scribe/
│               └── route.ts        # Scribe context updates (edge)
├── components/
│   └── lounge/
│       ├── ConversationArea.tsx
│       ├── ThinkingPeek.tsx
│       ├── AgentControls.tsx
│       ├── InputBar.tsx
│       └── ScribePanel.tsx
├── lib/
│   └── lounge/
│       ├── orchestrator.ts
│       ├── scribe.ts
│       └── prompts.ts
├── docs/
│   └── lounge/
│       └── PRD.md                  # This document
└── ... (existing Jam files)
```

### 9.3 API Contract

**POST /api/lounge/chat** (Streaming)

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Should I learn Python or JavaScript?" }
  ],
  "agents": {
    "claude": { 
      "verbosity": 2, 
      "creativity": 0.7, 
      "tension": 2, 
      "speed": 2 
    },
    "gemini": { 
      "verbosity": 3, 
      "creativity": 0.5, 
      "tension": 3, 
      "speed": 2 
    }
  },
  "scribeContext": "[Markdown from Scribe]"
}
```

Response (Streaming):
```
data: {"agent": "claude", "type": "peek", "content": "considering the tradeoffs..."}
data: {"agent": "claude", "type": "peek", "content": "Python's simplicity..."}
data: {"agent": "claude", "type": "complete", "content": "Full response here...", "tokens": {"in": 234, "out": 156}}
data: {"agent": "gemini", "type": "peek", "content": "building on that..."}
data: {"agent": "gemini", "type": "complete", "content": "Full response here...", "tokens": {"in": 312, "out": 203}}
data: {"type": "scribe", "content": "Updated context document..."}
```

**POST /api/lounge/poke**

Request:
```json
{
  "agent": "claude",
  "context": "[Current conversation state]"
}
```

Response: Same streaming format as chat

---

## 10. Timeline

### Day 1: Core Loop (8 hours)

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-2 | Create `/lounge` route + layout with agent panels | Page renders with controls |
| 2-4 | Chat UI: Conversation area + input bar + Hush button | Messages display, stop works |
| 4-6 | Claude API with streaming + Thinking Peek | Claude responds with peek effect |
| 6-8 | Gemini API + turn-taking orchestration | Both agents respond |

**Day 1 Complete:** User → Claude (with peek) → Gemini (with peek) loop working

### Day 2: Controls, Scribe & Polish (8 hours)

| Hours | Task | Deliverable |
|-------|------|-------------|
| 0-2 | Wire all 4 sliders to prompts + token counters | Sliders affect behavior |
| 2-4 | Energy bar + Poke button | Visual energy, manual trigger works |
| 4-6 | Scribe (Flash) background process | Context document maintained |
| 6-8 | Polish, testing, deploy | Production on Vercel |

**Day 2 Complete:** Full working Lounge with all Wave 1 features

---

## 11. Success Metrics

### 11.1 Functional Criteria

- [ ] Two agents (Claude + Gemini) with distinct identities
- [ ] Thinking Peek shows snippets during generation
- [ ] Agents reference each other's points naturally
- [ ] User can interject at any time
- [ ] Hush button stops generation immediately
- [ ] Poke button triggers specific agent
- [ ] All 4 sliders work and visibly affect behavior
- [ ] Token count displays (In/Out/Total per agent)
- [ ] Energy bar shows context usage
- [ ] Scribe maintains context document
- [ ] Deployed and accessible at `/lounge`

### 11.2 Quality Criteria (The Litmus Test)

**Prompt:** "Should I learn Python or JavaScript first?"

**Bad Response (FAIL):**
> Claude: "Python is good for beginners."
> Gemini: "I agree. Python is good."

**Good Response (PASS):**
> Claude: "Python. Cleaner syntax, less foot-guns, and it's the lingua franca of data science and AI. You'll be productive in days."
> 
> Gemini: "I'd push back slightly. If your goal is web development, JavaScript is unavoidable. You'll need it eventually, so why not start there?"
> 
> Claude: "Fair point, but learning to program is hard enough without JavaScript's quirks. Python lets you focus on concepts first."
> 
> Gemini: "True. For pure learning, Python's gentler. I'll concede that."

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agents ignore each other | High | Strong identity prompts + engagement rules |
| Token costs spiral | Medium | Speed slider caps tokens; Scribe manages context |
| Context window overflow | High | Scribe + Agent Refresh pattern |
| Responses too slow | Medium | Thinking Peek makes wait feel shorter |
| Streaming complexity | Medium | Start with simpler approach, iterate |

---

## 13. Out of Scope (Wave 1)

- Code execution
- File creation  
- Fourth agent (GPT)
- Personality presets
- Domain specialization
- Agent refresh/retirement (visual only in Wave 1)
- Conversation persistence
- Conversation history sidebar

These are Wave 2+ features.

---

## 14. Appendix: Conversation Patterns

### A. Natural Patterns to Encourage

- **Acknowledgment:** "Good point, Claude. Building on that..."
- **Respectful disagreement:** "I see where you're going, but have you considered..."
- **Light humor:** "Another counter app? Really pushing boundaries here 😄"
- **Vulnerability:** "I'm not certain about this. What do you think?"
- **Building:** "Yes, and we could also add..."
- **Direct questions:** "Gemini, what's your take on the performance angle?"

### B. Anti-Patterns to Avoid

- ❌ Agents ignoring each other's points
- ❌ Robotic handoffs ("I have completed my task. Passing to Claude.")
- ❌ Excessive formality ("As per your request...")
- ❌ Sycophancy ("What a great idea!")
- ❌ "As an AI language model..."
- ❌ Agents acting like each other
- ❌ Repetition of the same point
- ❌ Talking past each other

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2, 2026 | Initial PRD |
| 1.1 | Jan 2, 2026 | Added: Thinking Peek, Scribe system, Energy bar, Hush/Poke buttons, Identity prompts, In/Out/Total tokens |
| 1.2 | Jan 2, 2026 | Added: Brackets Method for Thinking Peek, Vercel Edge Runtime requirement, implementation specifics |

---

**Document Status:** Ready for Implementation

**Next Step:** Begin Day 1 Sprint

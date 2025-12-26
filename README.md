# Project Jam 🎸

**Dual-agent orchestration layer where Claude builds and Gemini supervises.**

Built for the 16GB MacBook Air developer who refuses to spin up their own fan.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Project Jam UI                         │
├─────────────────────────────┬───────────────────────────────┤
│       The Brain             │         The Output            │
│   (Agent Dialogue)          │   (Terminal / Preview)        │
│                             │                               │
│   [User] Build a todo app   │   $ npm create vite@latest    │
│   [Claude] Creating...      │   $ npm install               │
│   [Gemini] Looks good ✓     │   $ npm run dev               │
│                             │                               │
└─────────────────────────────┴───────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   E2B Sandbox     │
                    │  (Cloud Ubuntu)   │
                    └───────────────────┘
```

## Quick Start (Deploy to Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Day 1 scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/project-jam.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repo
4. Add environment variable:
   - `E2B_API_KEY` = your E2B API key (get one at [e2b.dev](https://e2b.dev))
5. Deploy

### 3. Get Your E2B API Key

1. Sign up at [e2b.dev](https://e2b.dev)
2. Go to Dashboard → API Keys
3. Create a new key
4. Add it to Vercel environment variables

## Local Development (Optional)

If you must run locally:

```bash
npm install
cp .env.example .env.local
# Add your E2B_API_KEY to .env.local
npm run dev
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Sandbox:** E2B (cloud Ubuntu environments)
- **Deployment:** Vercel

## Day 1 Milestone ✓

- [x] Next.js 15 scaffold
- [x] Two-pane UI (Brain + Output)
- [x] E2B SDK integration
- [x] Server actions for sandbox operations
- [x] Command bar with status indicators

## Coming Up

- **Day 2:** Claude + Gemini agent integration
- **Day 3:** Debate UI + Supervisor intervention

---

*Built for vibes, not compiles.*

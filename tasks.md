# 🎼 Project Jam: Active Task Ledger

**Last Updated:** 2025-12-29 10:30 UTC  
**Current Status:** ✅ Wave 2 Complete - Progressive Disclosure + Live Preview

---

## 🔄 ACTIVE IMPLEMENTATION

| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| `orchestrateFix()` with Safety Triggers | 🔄 Active | Claude | Architect-approved spec |
| `sanitizeError()` function | ✅ Done | Claude | Strip timestamps, addresses, UUIDs |
| `isTransientError()` function | ✅ Done | Claude | Silent retry on network blips |
| Dependency Sentinel | ✅ Done | Claude | Force review on package.json changes |
| Error signature loop detection | ✅ Done | Claude | Sanitized hash comparison |
| Reset strategy (continue/purge/full_reset) | ✅ Done | Claude | With Key Vault re-verification |
| `executeWithRetry()` loop | ✅ Done | Claude | Max 3 attempts, silent retry for transient |

---

## ✅ COMPLETED (Wave 2 - MVO)

| Task | Date | Notes |
|------|------|-------|
| MVO Prompts (minimal, trust-based) | 2025-12-29 | Handshake-only constraints |
| Architect-First Flow | 2025-12-29 | Gemini speaks first |
| Basic orchestrator | 2025-12-29 | Director → Architect → Engineer → Execute |
| Claude API Integration | 2025-12-29 | Opus 4.5 (`claude-opus-4-5-20251101`) |
| Gemini API Integration | 2025-12-29 | Gemini 3 Pro (`gemini-3-pro-preview`) |
| UI: Role badges, timestamps, icons | 2025-12-29 | Director terminology |
| WhatsApp-style chat bubbles | 2025-12-29 | 70/30 panel split |

---

## ✅ COMPLETED (Wave 1 - Foundation)

| Task | Date | Notes |
|------|------|-------|
| Next.js 15 on Vercel | 2025-12-27 | App Router |
| E2B Sandbox Integration | 2025-12-27 | Live terminal streaming |
| Clerk Auth | 2025-12-27 | User management |
| Upstash Key Vault | 2025-12-28 | AES-256 encrypted |
| GitHub OAuth | 2025-12-28 | Token stored in vault |
| Onboarding Flow | 2025-12-28 | API key collection |
| Settings Page | 2025-12-28 | Key management UI |

---

## 📋 QUEUED (Wave 3+)

| Task | Priority | Owner | Notes |
|------|----------|-------|-------|
| Session burn counter UI | P2 | TBD | Passive cost visibility |
| Session allowance settings | P2 | TBD | Budget per task |
| Program Manager (Haiku) | P3 | TBD | Cost estimation |
| MLOps Engineer (Flash) | P3 | TBD | Adversarial testing |
| Live Preview panel | P2 | TBD | Vite dev server in iframe |
| Debate Mode UI | P3 | TBD | Visualize disagreements |
| Auto-commit snapshots | P2 | TBD | Green state checkpoints |

---

## 🏛️ ARCHITECTURE REFERENCE

### Self-Correction Flow
```
Execute Actions
     ↓
┌─── SUCCESS ─────────────────────────────────┐
│ ✓ Build Complete                            │
└─────────────────────────────────────────────┘
     ↓
┌─── FAILURE ─────────────────────────────────┐
│                                             │
│  Is it transient? (network, 500s)           │
│     YES → Silent retry (up to 2x)           │
│     NO  ↓                                   │
│                                             │
│  Engineer diagnoses:                        │
│    - failureCategory                        │
│    - resetStrategy                          │
│    - proposed fix actions                   │
│                                             │
│  Dependency Sentinel check:                 │
│    - Does fix modify package.json?          │
│      YES → Force Architect review           │
│                                             │
│  Architect reviews fix                      │
│                                             │
│  Sanitize errors, compute signature         │
│                                             │
│  Same signature as last attempt?            │
│     YES → STAGNATION → Escalate to Director │
│     NO  → Execute fix                       │
│                                             │
└─────────────────────────────────────────────┘
```

### Safety Triggers

| # | Trigger | Purpose |
|---|---------|---------|
| 1 | Reset Strategy | Re-verify Key Vault on `full_reset` |
| 2 | Dependency Sentinel | Force Architect review on package changes |
| 3 | Error Sanitization | Strip timestamps/addresses before loop detection |
| 4 | Silent Retry | Auto-retry transient network errors (2x max) |

### Failure Categories

| Category | Examples | Handling |
|----------|----------|----------|
| `plumbing` | git init, npm install, permissions | Engineer fixes autonomously |
| `logic` | Syntax error, runtime error, types | Engineer fixes, Architect reviews |
| `architectural` | Wrong framework, misunderstood intent | Immediate escalation to Architect |

---

## 🎯 SUCCESS CRITERIA (Wave 2)

- [ ] "Build a counter app" completes with self-healing on git/npm failures
- [ ] Stagnation detection triggers on same error twice
- [ ] Dependency changes trigger Architect review
- [ ] Transient errors get silent retry
- [ ] Max 3 attempts before escalating to Director

---

## 📝 LESSONS LEARNED

1. **Frontier models don't need micro-management** — they need clear orchestration protocols
2. **Over-prescriptive prompts reduce emergent intelligence** — trust the models
3. **System layer should handle validation** — not model responsibility
4. **Progress over price** — stop on stagnation, not cost
5. **Error sanitization is critical** — timestamps cause false "progress" detection
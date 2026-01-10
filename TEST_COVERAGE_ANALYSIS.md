# Test Coverage Analysis Report

**Project:** Project Jam
**Date:** January 10, 2026
**Current Coverage:** 0%

## Executive Summary

This codebase currently has **zero test coverage**. There are no test files, no testing frameworks installed, and no test scripts configured. This analysis identifies critical areas that need testing and provides prioritized recommendations.

---

## Current State

| Metric | Value |
|--------|-------|
| Test Files | 0 |
| Testing Framework | None installed |
| Test Scripts | None configured |
| TypeScript Files | ~20 |
| React Components | 4 |
| Library Utilities | 7 |
| Server Actions | 10+ |
| API Routes | 3 |

---

## Priority 1: Critical Business Logic (High Risk)

### 1.1 Orchestrator (`lib/orchestrator.ts`)

**Why Critical:** This is the core brain of the application - the dual-agent orchestration between Claude and Gemini. Bugs here can cause complete system failures.

**Functions to Test:**
- `orchestrate()` - Main orchestration flow
- `orchestrateFix()` - Error recovery and retry logic
- `parseJSON()` - JSON extraction from AI responses
- `isTransient()` - Transient error detection
- `isStagnant()` - Error loop detection
- `buildContext()` - Environment context builder

**Suggested Tests:**
```typescript
// lib/__tests__/orchestrator.test.ts

describe('orchestrator', () => {
  describe('parseJSON', () => {
    it('should parse clean JSON', () => {})
    it('should strip markdown code blocks', () => {})
    it('should handle ```json prefix', () => {})
    it('should handle plain ``` prefix', () => {})
    it('should return error for invalid JSON', () => {})
  })

  describe('isTransient', () => {
    it('should detect ETIMEDOUT errors', () => {})
    it('should detect ECONNRESET errors', () => {})
    it('should detect socket hang up', () => {})
    it('should return false for non-transient errors', () => {})
  })

  describe('orchestrate', () => {
    it('should return clarification phase when architect needs info', () => {})
    it('should proceed to complete phase with valid plan', () => {})
    it('should escalate on JSON parse failure', () => {})
    it('should handle empty action plans', () => {})
  })

  describe('orchestrateFix', () => {
    it('should silently retry transient errors', () => {})
    it('should escalate on stagnant errors', () => {})
    it('should escalate architectural issues', () => {})
    it('should return approved fixes for plumbing issues', () => {})
  })
})
```

### 1.2 Model Configuration (`lib/models.ts`)

**Why Critical:** Cost calculation errors can lead to billing discrepancies. Model selection bugs can use wrong/expensive models.

**Functions to Test:**
- `getModelById()` - Model lookup
- `getActiveClaudeModel()` - Claude model selection based on speed
- `getActiveGeminiModel()` - Gemini model selection based on speed
- `getScribeModel()` - Scribe model selection
- `calculateCost()` - Token cost calculation
- `getAllModels()` - Model listing
- `getModelsByProvider()` - Provider filtering
- `getModelOptions()` - UI model grouping

**Suggested Tests:**
```typescript
// lib/__tests__/models.test.ts

describe('models', () => {
  describe('getModelById', () => {
    it('should find claude-opus-4-5-20251101', () => {})
    it('should find gemini-3-pro-preview', () => {})
    it('should return undefined for unknown model', () => {})
  })

  describe('getActiveClaudeModel', () => {
    it('should return flagship model for speed 1', () => {})
    it('should return flagship model for speed 2', () => {})
    it('should return fast model for speed 3', () => {})
  })

  describe('calculateCost', () => {
    it('should calculate Claude Opus 4.5 costs correctly', () => {
      // Input: $5/1M, Output: $25/1M
      // 1000 input + 500 output = $0.005 + $0.0125 = $0.0175
    })
    it('should calculate Gemini Flash costs correctly', () => {})
    it('should return 0 for unknown model', () => {})
  })

  describe('getAllModels', () => {
    it('should exclude deprecated models', () => {})
    it('should include both providers', () => {})
  })

  describe('getModelOptions', () => {
    it('should group by provider and tier', () => {})
  })
})
```

---

## Priority 2: Security-Critical Functions (High Risk)

### 2.1 Vault (`lib/vault.ts`)

**Why Critical:** Handles API key encryption/decryption. Security bugs could leak user credentials.

**Functions to Test:**
- `encrypt()` / `decrypt()` - Encryption roundtrip
- `saveApiKeys()` - Key storage
- `getApiKeys()` - Key retrieval
- `deleteApiKey()` - Key deletion
- `hasCompletedOnboarding()` - Onboarding check

**Suggested Tests:**
```typescript
// lib/__tests__/vault.test.ts

describe('vault', () => {
  describe('encryption', () => {
    it('should encrypt and decrypt text correctly', () => {})
    it('should produce different ciphertext for same plaintext', () => {})
    it('should fail gracefully with invalid ciphertext', () => {})
  })

  describe('saveApiKeys', () => {
    it('should encrypt all provided keys', () => {})
    it('should skip undefined keys', () => {})
  })

  describe('getApiKeys', () => {
    it('should decrypt all stored keys', () => {})
    it('should return empty object when no keys exist', () => {})
  })

  describe('hasCompletedOnboarding', () => {
    it('should return true when both anthropic and google keys exist', () => {})
    it('should return false when only anthropic key exists', () => {})
    it('should return false when no keys exist', () => {})
  })
})
```

---

## Priority 3: Server Actions (`app/actions.ts`)

**Why Important:** These are the bridge between frontend and backend. Errors here cause user-facing failures.

**Functions to Test:**
- `startSandboxAction()` - Sandbox creation
- `listFilesAction()` - File listing
- `readFileAction()` - File reading
- `orchestrateAction()` - Orchestration wrapper
- `orchestrateFixAction()` - Fix wrapper
- `executeActionsAction()` - Action execution
- `detectPort()` - Port detection helper
- `parseCwd()` - CWD parsing helper

**Suggested Tests:**
```typescript
// app/__tests__/actions.test.ts

describe('actions', () => {
  describe('detectPort', () => {
    it('should detect --port flag', () => {
      expect(detectPort('npm run dev --port 3001')).toBe(3001)
    })
    it('should detect port in URL pattern', () => {
      expect(detectPort('localhost:4000')).toBe(4000)
    })
    it('should default to 5173 for vite', () => {
      expect(detectPort('npx vite')).toBe(5173)
    })
    it('should default to 3000 for next', () => {
      expect(detectPort('next dev')).toBe(3000)
    })
    it('should default to 8080 for unknown', () => {
      expect(detectPort('node server.js')).toBe(8080)
    })
  })

  describe('parseCwd', () => {
    it('should extract cwd from cd command', () => {
      expect(parseCwd('cd myapp && npm run dev')).toEqual({
        cwd: 'myapp',
        cmd: 'npm run dev'
      })
    })
    it('should return original command without cd', () => {
      expect(parseCwd('npm install')).toEqual({ cmd: 'npm install' })
    })
  })

  describe('executeActionsAction', () => {
    it('should handle createFile actions', () => {})
    it('should handle runCommand actions', () => {})
    it('should detect dev server commands', () => {})
    it('should wait for port on dev servers', () => {})
    it('should timeout commands after 120s', () => {})
  })
})
```

---

## Priority 4: React Components

**Why Important:** UI bugs cause poor user experience and confusion.

### Components to Test:

| Component | File | Test Focus |
|-----------|------|------------|
| BrainPanel | `components/BrainPanel.tsx` | Message rendering, role-based styling |
| OutputPanel | `components/OutputPanel.tsx` | Tab switching, terminal/preview/files display |
| CommandBar | `components/CommandBar.tsx` | Input handling, submit/cancel behavior |
| StatusIndicator | `components/StatusIndicator.tsx` | Status display, animations |

**Suggested Tests:**
```typescript
// components/__tests__/BrainPanel.test.tsx

describe('BrainPanel', () => {
  it('should render messages with correct roles', () => {})
  it('should apply correct styling for Claude messages', () => {})
  it('should apply correct styling for Gemini messages', () => {})
  it('should auto-scroll on new messages', () => {})
})

// components/__tests__/OutputPanel.test.tsx

describe('OutputPanel', () => {
  it('should switch between Terminal, Preview, and Files tabs', () => {})
  it('should display terminal output', () => {})
  it('should show preview iframe when URL available', () => {})
  it('should list files correctly', () => {})
})

// components/__tests__/CommandBar.test.tsx

describe('CommandBar', () => {
  it('should submit on Enter key', () => {})
  it('should call onCancel when cancel button clicked', () => {})
  it('should disable input when loading', () => {})
  it('should clear input after submission', () => {})
})
```

---

## Priority 5: API Routes

### 5.1 Lounge Chat (`app/api/lounge/chat/route.ts`)

**Functions to Test:**
- Request validation
- Streaming response handling
- Agent priority/bias logic
- Scribe summary triggering
- Image attachment handling
- Error responses

### 5.2 GitHub Auth (`app/api/auth/github/`)

**Functions to Test:**
- OAuth callback handling
- Token exchange
- Error handling

---

## Priority 6: Integration Tests (E2E)

**Recommended E2E Scenarios:**
1. User enters intent → orchestration → code generated → preview displayed
2. Build fails → fix orchestration → retry → success
3. User cancels mid-orchestration
4. Network timeout recovery
5. API key validation flow
6. GitHub repository creation and push

---

## Recommended Testing Setup

### Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Configure Vitest (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

### Add Test Scripts (`package.json`)

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Implementation Roadmap

| Phase | Focus Area | Estimated Tests |
|-------|------------|-----------------|
| 1 | `lib/models.ts` (pure functions) | 15-20 |
| 2 | `lib/orchestrator.ts` (with mocks) | 20-25 |
| 3 | `lib/vault.ts` (with Redis mock) | 10-15 |
| 4 | `app/actions.ts` helper functions | 10-15 |
| 5 | React components | 15-20 |
| 6 | API routes | 10-15 |
| 7 | E2E tests (Playwright) | 5-10 |

**Total Estimated Tests:** 85-120

---

## Risk Assessment

| Area | Risk Level | Impact | Likelihood |
|------|------------|--------|------------|
| Orchestrator bugs | **Critical** | System-wide failures | Medium |
| Cost calculation errors | **High** | Billing issues | Low |
| Vault security issues | **Critical** | Credential leak | Low |
| Port detection bugs | **Medium** | Preview failures | Medium |
| Component rendering | **Low** | Poor UX | Medium |

---

## Conclusion

The complete absence of tests in this codebase represents significant technical debt. Given the complexity of the dual-agent orchestration system and the handling of sensitive API keys, implementing comprehensive tests should be a priority.

**Recommended first steps:**
1. Install Vitest and testing utilities
2. Start with `lib/models.ts` - pure functions, easy to test
3. Add mocked tests for `lib/orchestrator.ts`
4. Add vault tests with Redis mocks
5. Add component tests with React Testing Library

This will provide a foundation of confidence for future development and refactoring.

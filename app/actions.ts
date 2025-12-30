'use server'

import { Sandbox } from 'e2b'
import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

// ============================================
// Server Command Detection
// ============================================
const SERVER_PATTERNS = [
  /npm\s+run\s+dev/i, /npm\s+start/i, /yarn\s+dev/i, /pnpm\s+dev/i,
  /npx\s+serve/i, /npx\s+vite/i, /python.*http\.server/i, /next\s+dev/i
]

function isServerCommand(cmd: string): boolean {
  return SERVER_PATTERNS.some(p => p.test(cmd))
}

function detectPort(cmd: string): number {
  const match = cmd.match(/--port\s*(\d+)/) || cmd.match(/:(\d{4})/) || cmd.match(/\s(\d{4})\s*$/)
  if (match) return parseInt(match[1])
  if (cmd.includes('vite') || cmd.includes('npm run dev')) return 5173
  if (cmd.includes('next')) return 3000
  return 8080
}

function extractCwd(cmd: string): { cwd?: string; cleanCmd: string } {
  const match = cmd.match(/^cd\s+([^\s&]+)\s*&&\s*(.+)$/)
  return match ? { cwd: match[1], cleanCmd: match[2].trim() } : { cleanCmd: cmd }
}

// ============================================
// Sandbox Actions
// ============================================
export async function startSandboxAction() {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY })
  return { sandboxId: sandbox.sandboxId }
}

export async function listFilesAction(sandboxId: string, path = '.') {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const files = await sandbox.files.list(path)
  return { files: files.map(f => f.name) }
}

export async function readFileAction(sandboxId: string, filePath: string) {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  try {
    const content = await sandbox.files.read(filePath)
    const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
    return { success: true, content: text }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function purgeDirectoryAction(sandboxId: string, path: string) {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const r = await sandbox.commands.run(`rm -rf ${path}`)
  return { success: r.exitCode === 0 }
}

export async function fullResetAction() {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY })
  return { sandboxId: sandbox.sandboxId }
}

// ============================================
// Orchestration Actions
// ============================================
export async function orchestrateAction(userIntent: string, sandboxId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const keys = await getApiKeys(userId)
  if (!keys.anthropic || !keys.google) throw new Error('API keys not configured')
  const { orchestrate } = await import('@/lib/orchestrator')
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const files = await sandbox.files.list('.')
  return orchestrate(keys.anthropic, keys.google, userIntent, sandboxId, files.map(f => f.name))
}

export async function orchestrateFixAction(
  intent: string,
  failures: { action: string; error: string }[],
  sandboxId: string,
  attempt: number,
  silentRetry = 0
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const keys = await getApiKeys(userId)
  if (!keys.anthropic || !keys.google) throw new Error('API keys not configured')
  const { orchestrateFix } = await import('@/lib/orchestrator')
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const files = await sandbox.files.list('.')
  return orchestrateFix(keys.anthropic, keys.google, intent, failures, sandboxId, files.map(f => f.name), attempt, silentRetry)
}

// ============================================
// Execute Actions (with E2B background: true + liveness check)
// ============================================
export async function executeActionsAction(
  sandboxId: string,
  actions: { type: string; path?: string; content?: string; command?: string; name?: string; message?: string }[]
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const keys = await getApiKeys(userId)
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })

  const results: { action: string; success: boolean; output?: string; previewUrl?: string; port?: number }[] = []

  for (const action of actions) {
    try {
      // CREATE FILE
      if (action.type === 'createFile' && action.path && action.content) {
        await sandbox.files.write(action.path, action.content)
        results.push({ action: `Create ${action.path}`, success: true })
      }

      // RUN COMMAND
      if (action.type === 'runCommand' && action.command) {
        const { cwd, cleanCmd } = extractCwd(action.command)

        if (isServerCommand(cleanCmd)) {
          const port = detectPort(cleanCmd)

          // === THE FIX: Use E2B's native background execution ===
          await sandbox.commands.run(cleanCmd, {
            background: true,
            cwd: cwd || undefined
          })

          // Wait for server to initialize
          await new Promise(r => setTimeout(r, 5000))

          // === LIVENESS CHECK: Verify server is actually running ===
          let isAlive = false
          for (let i = 0; i < 3; i++) {
            const check = await sandbox.commands.run(
              `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port} || echo "failed"`,
              { timeoutMs: 3000 }
            )
            const code = check.stdout?.trim()
            if (code && code !== 'failed' && code !== '000') {
              isAlive = true
              break
            }
            await new Promise(r => setTimeout(r, 2000))
          }

          if (isAlive) {
            const host = sandbox.getHost(port)
            const previewUrl = `https://${host}`
            results.push({
              action: action.command,
              success: true,
              output: `Server verified on port ${port}`,
              previewUrl,
              port
            })
          } else {
            // Server didn't start - report failure for self-correction
            results.push({
              action: action.command,
              success: false,
              output: `Server started but liveness check failed on port ${port}. Process may have crashed.`
            })
          }
        } else {
          // Regular command
          const r = await sandbox.commands.run(action.command, { timeoutMs: 120000 })
          results.push({
            action: action.command,
            success: r.exitCode === 0,
            output: r.stdout || r.stderr
          })
        }
      }

      // CREATE REPO
      if (action.type === 'createRepo' && action.name && keys.github) {
        const { createRepo, getUser } = await import('@/lib/github')
        const user = await getUser(keys.github)
        const repo = await createRepo(keys.github, action.name, true)
        results.push({ action: `Create repo ${action.name}`, success: true, output: repo.html_url })
      }

      // COMMIT
      if (action.type === 'commit' && action.message) {
        const r = await sandbox.commands.run(`git add -A && git commit -m "${action.message}"`)
        results.push({ action: `Commit`, success: r.exitCode === 0, output: r.stdout || r.stderr })
      }

    } catch (e) {
      results.push({ action: action.type, success: false, output: String(e) })
    }
  }

  return results
}
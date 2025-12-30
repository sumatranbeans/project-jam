'use server'

import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'
import { createSandboxProvider, type SandboxProvider } from '@/lib/sandbox'

// Provider instances cached by session
const providers = new Map<string, SandboxProvider>()

function getProvider(sessionId: string): SandboxProvider {
  const existing = providers.get(sessionId)
  if (existing) return existing
  throw new Error(`No provider for session ${sessionId}. Call startSandboxAction first.`)
}

// ============================================
// Sandbox Lifecycle
// ============================================
export async function startSandboxAction() {
  const provider = createSandboxProvider('codesandbox')
  const session = await provider.create()
  providers.set(session.id, provider)
  return { sandboxId: session.id, provider: session.provider }
}

export async function hibernateSandboxAction(sessionId: string) {
  const provider = getProvider(sessionId)
  await provider.hibernate()
  return { hibernated: true }
}

// ============================================
// File Operations
// ============================================
export async function listFilesAction(sessionId: string, path: string = '.') {
  const provider = getProvider(sessionId)
  const files = await provider.listFiles(path)
  return { files: files.map(f => f.name) }
}

export async function readFileAction(sessionId: string, filePath: string) {
  const provider = getProvider(sessionId)
  try {
    const content = await provider.readFile(filePath)
    return { success: true, content }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ============================================
// Orchestration Actions
// ============================================
export async function orchestrateAction(userIntent: string, sessionId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const keys = await getApiKeys(userId)
  if (!keys.anthropic || !keys.google) throw new Error('API keys not configured')
  
  const provider = getProvider(sessionId)
  const files = await provider.listFiles('.')
  
  const { orchestrate } = await import('@/lib/orchestrator')
  return orchestrate(keys.anthropic, keys.google, userIntent, sessionId, files.map(f => f.name))
}

export async function orchestrateFixAction(
  intent: string,
  failures: { action: string; error: string }[],
  sessionId: string,
  attempt: number,
  silentRetry = 0
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const keys = await getApiKeys(userId)
  if (!keys.anthropic || !keys.google) throw new Error('API keys not configured')
  
  const provider = getProvider(sessionId)
  const files = await provider.listFiles('.')
  
  const { orchestrateFix } = await import('@/lib/orchestrator')
  return orchestrateFix(keys.anthropic, keys.google, intent, failures, sessionId, files.map(f => f.name), attempt, silentRetry)
}

// ============================================
// Execute Build Actions
// ============================================
export async function executeActionsAction(
  sessionId: string,
  actions: { type: string; path?: string; content?: string; command?: string; port?: number }[]
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const provider = getProvider(sessionId)
  const results: { action: string; success: boolean; output?: string; previewUrl?: string }[] = []

  for (const action of actions) {
    try {
      // CREATE FILE
      if (action.type === 'createFile' && action.path && action.content) {
        await provider.writeFile(action.path, action.content)
        results.push({ action: `Create ${action.path}`, success: true })
      }

      // RUN COMMAND
      if (action.type === 'runCommand' && action.command) {
        const isServer = /npm\s+run\s+dev|npm\s+start|yarn\s+dev|npx\s+serve|npx\s+vite/i.test(action.command)
        
        if (isServer) {
          const port = action.port || detectPort(action.command)
          const { cwd, cleanCmd } = extractCwd(action.command)
          
          // Run in background
          await provider.runBackground(cleanCmd, { cwd })
          
          // Wait for port with 20s timeout (per Manifesto)
          try {
            const portInfo = await provider.waitForPort(port, 20000)
            results.push({
              action: action.command,
              success: true,
              output: `Server running on port ${port}`,
              previewUrl: portInfo.previewUrl
            })
          } catch (e) {
            results.push({
              action: action.command,
              success: false,
              output: `Server failed to start on port ${port}: ${e}`
            })
          }
        } else {
          // Regular command
          const result = await provider.run(action.command, { timeout: 120000 })
          results.push({
            action: action.command,
            success: result.success,
            output: result.stdout || result.stderr
          })
        }
      }
    } catch (e) {
      results.push({ action: action.type, success: false, output: String(e) })
    }
  }

  return results
}

// ============================================
// Legacy actions (for compatibility)
// ============================================
export async function purgeDirectoryAction(sessionId: string, path: string) {
  const provider = getProvider(sessionId)
  const result = await provider.run(`rm -rf ${path}`)
  return { success: result.success }
}

export async function fullResetAction() {
  // Create a fresh sandbox
  const provider = createSandboxProvider('codesandbox')
  const session = await provider.create()
  providers.set(session.id, provider)
  return { sandboxId: session.id }
}

// ============================================
// Helpers
// ============================================
function detectPort(cmd: string): number {
  const match = cmd.match(/--port\s*(\d+)/) || cmd.match(/:(\d{4})/)
  if (match) return parseInt(match[1])
  if (cmd.includes('vite') || cmd.includes('npm run dev')) return 5173
  if (cmd.includes('next')) return 3000
  return 8080
}

function extractCwd(cmd: string): { cwd?: string; cleanCmd: string } {
  const match = cmd.match(/^cd\s+([^\s&]+)\s*&&\s*(.+)$/)
  return match ? { cwd: match[1], cleanCmd: match[2].trim() } : { cleanCmd: cmd }
}
'use server'

import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'
import { CodeSandboxProvider } from '@/lib/sandbox/codesandbox'

// ============================================
// Helper: Get provider for session (reconnects each time)
// ============================================
async function getProvider(sessionId: string): Promise<CodeSandboxProvider> {
  const provider = new CodeSandboxProvider()
  await provider.connect(sessionId)
  return provider
}

// ============================================
// Sandbox Lifecycle
// ============================================
export async function startSandboxAction() {
  const provider = new CodeSandboxProvider()
  const session = await provider.create()
  return { sandboxId: session.id }
}

// ============================================
// File Operations
// ============================================
export async function listFilesAction(sessionId: string, path: string = '.') {
  try {
    const provider = await getProvider(sessionId)
    const files = await provider.listFiles(path)
    return { files: files.map(f => f.name) }
  } catch (e) {
    console.error('listFilesAction error:', e)
    return { files: [] }
  }
}

export async function readFileAction(sessionId: string, filePath: string) {
  try {
    const provider = await getProvider(sessionId)
    const content = await provider.readFile(filePath)
    return { success: true, content }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ============================================
// Orchestration
// ============================================
export async function orchestrateAction(userIntent: string, sessionId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const keys = await getApiKeys(userId)
  if (!keys.anthropic || !keys.google) throw new Error('API keys not configured')
  
  let files: string[] = []
  try {
    const provider = await getProvider(sessionId)
    const fileList = await provider.listFiles('.')
    files = fileList.map(f => f.name)
  } catch (e) {
    console.error('Failed to list files:', e)
  }
  
  const { orchestrate } = await import('@/lib/orchestrator')
  return orchestrate(keys.anthropic, keys.google, userIntent, sessionId, files)
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
  
  let files: string[] = []
  try {
    const provider = await getProvider(sessionId)
    const fileList = await provider.listFiles('.')
    files = fileList.map(f => f.name)
  } catch (e) {
    console.error('Failed to list files:', e)
  }
  
  const { orchestrateFix } = await import('@/lib/orchestrator')
  return orchestrateFix(keys.anthropic, keys.google, intent, failures, sessionId, files, attempt, silentRetry)
}

// ============================================
// Execute Actions
// ============================================
export async function executeActionsAction(
  sessionId: string,
  actions: { type: string; path?: string; content?: string; command?: string; port?: number }[]
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const provider = await getProvider(sessionId)
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
        const isServer = /npm\s+run\s+dev|npm\s+start|yarn\s+dev|npx\s+vite|npx\s+serve/i.test(action.command)
        
        if (isServer) {
          const port = action.port || detectPort(action.command)
          const { cwd, cmd } = parseCwd(action.command)
          
          await provider.runBackground(cmd, { cwd })
          
          try {
            const portInfo = await provider.waitForPort(port, 30000)
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
              output: `Port ${port} did not open: ${e}`
            })
          }
        } else {
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
// Helpers
// ============================================
function detectPort(cmd: string): number {
  const m = cmd.match(/--port\s*(\d+)/) || cmd.match(/:(\d{4})/)
  if (m) return parseInt(m[1])
  if (/vite|npm run dev/.test(cmd)) return 5173
  if (/next/.test(cmd)) return 3000
  return 8080
}

function parseCwd(cmd: string): { cwd?: string; cmd: string } {
  const m = cmd.match(/^cd\s+([^\s&]+)\s*&&\s*(.+)$/)
  return m ? { cwd: m[1], cmd: m[2].trim() } : { cmd }
}
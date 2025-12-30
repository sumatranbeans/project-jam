'use server'

import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'
import { CodeSandbox } from '@codesandbox/sdk'

// ============================================
// SDK Singleton
// ============================================
function getSDK(): CodeSandbox {
  return new CodeSandbox(process.env.CSB_API_KEY)
}

// ============================================
// Helper: Get provider with timeout and status check
// ============================================
async function getConnectedClient(sandboxId: string) {
  const sdk = getSDK()
  
  console.log(`[CSB] Resuming sandbox: ${sandboxId}`)
  const sandbox = await sdk.sandboxes.resume(sandboxId)
  
  console.log(`[CSB] Sandbox status: ${sandbox.status}`)
  if (sandbox.status === 'hibernating') {
    console.log('[CSB] Sandbox hibernating, waking up...')
  }
  
  // Connection with hard timeout (12s)
  console.log('[CSB] Connecting...')
  const client = await Promise.race([
    sandbox.connect(),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Sandbox connect timeout (12s)')), 12000)
    )
  ])
  
  console.log('[CSB] Connected successfully')
  return { sandbox, client }
}

// ============================================
// Sandbox Lifecycle
// ============================================
export async function startSandboxAction() {
  const sdk = getSDK()
  console.log('[CSB] Creating new sandbox...')
  const sandbox = await sdk.sandboxes.create()
  console.log(`[CSB] Created: ${sandbox.id}`)
  return { sandboxId: sandbox.id }
}

// ============================================
// File Operations
// ============================================
export async function listFilesAction(sandboxId: string, path: string = '.') {
  try {
    const { client } = await getConnectedClient(sandboxId)
    const files = await client.fs.readdir(path)
    return { files: files?.map((f: any) => f.name) || [] }
  } catch (e) {
    console.error('[CSB] listFiles error:', e)
    return { files: [] }
  }
}

export async function readFileAction(sandboxId: string, filePath: string) {
  try {
    const { client } = await getConnectedClient(sandboxId)
    const content = await client.fs.readTextFile(filePath)
    return { success: true, content }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

// ============================================
// Orchestration
// ============================================
export async function orchestrateAction(userIntent: string, sandboxId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const keys = await getApiKeys(userId)
  if (!keys.anthropic || !keys.google) throw new Error('API keys not configured')
  
  let files: string[] = []
  try {
    const { client } = await getConnectedClient(sandboxId)
    const fileList = await client.fs.readdir('.')
    files = fileList?.map((f: any) => f.name) || []
  } catch (e) {
    console.error('[CSB] Failed to list files:', e)
  }
  
  const { orchestrate } = await import('@/lib/orchestrator')
  return orchestrate(keys.anthropic, keys.google, userIntent, sandboxId, files)
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
  
  let files: string[] = []
  try {
    const { client } = await getConnectedClient(sandboxId)
    const fileList = await client.fs.readdir('.')
    files = fileList?.map((f: any) => f.name) || []
  } catch (e) {
    console.error('[CSB] Failed to list files:', e)
  }
  
  const { orchestrateFix } = await import('@/lib/orchestrator')
  return orchestrateFix(keys.anthropic, keys.google, intent, failures, sandboxId, files, attempt, silentRetry)
}

// ============================================
// Execute Actions - THE CRITICAL FIX
// ============================================
export async function executeActionsAction(
  sandboxId: string,
  actions: { type: string; path?: string; content?: string; command?: string; port?: number }[]
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  console.log(`[EXEC] Starting execution of ${actions.length} actions`)
  
  const { client } = await getConnectedClient(sandboxId)
  const results: { action: string; success: boolean; output?: string; previewUrl?: string }[] = []

  for (const action of actions) {
    try {
      // ========== CREATE FILE ==========
      if (action.type === 'createFile' && action.path && action.content) {
        console.log(`[EXEC] Creating file: ${action.path}`)
        await client.fs.writeTextFile(action.path, action.content)
        results.push({ action: `Create ${action.path}`, success: true })
        console.log(`[EXEC] ✓ Created: ${action.path}`)
      }

      // ========== RUN COMMAND ==========
      if (action.type === 'runCommand' && action.command) {
        const isDevServer = /npm\s+run\s+dev|npm\s+start|yarn\s+dev|npx\s+vite|npx\s+serve/i.test(action.command)
        
        if (isDevServer) {
          // ===== DEV SERVER: Use runBackground + waitForPort =====
          const port = action.port || detectPort(action.command)
          const { cwd, cmd } = parseCwd(action.command)
          
          console.log(`[EXEC] Starting dev server: ${cmd} (port ${port})`)
          
          // Start in background - DO NOT await the command itself
          client.commands.runBackground(cmd, { cwd })
          
          console.log(`[EXEC] Waiting for port ${port}...`)
          
          // Wait for port with timeout
          try {
            const portInfo = await Promise.race([
              client.ports.waitForPort(port),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error(`Port ${port} timeout (30s)`)), 30000)
              )
            ])
            
            const previewUrl = portInfo?.getPreviewUrl?.() || `https://${sandboxId}-${port}.csb.app`
            console.log(`[EXEC] ✓ Server ready: ${previewUrl}`)
            
            results.push({
              action: action.command,
              success: true,
              output: `Server running on port ${port}`,
              previewUrl
            })
          } catch (e) {
            console.error(`[EXEC] ✗ Port ${port} failed:`, e)
            results.push({
              action: action.command,
              success: false,
              output: `Port ${port} did not open: ${e}`
            })
          }
        } else {
          // ===== REGULAR COMMAND: Use run() and await completion =====
          console.log(`[EXEC] Running command: ${action.command}`)
          
          try {
            // Run with timeout
            const result = await Promise.race([
              client.commands.run(action.command),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Command timeout (120s)')), 120000)
              )
            ])
            
            const success = result?.exitCode === 0
            const output = result?.stdout || result?.stderr || ''
            
            console.log(`[EXEC] ${success ? '✓' : '✗'} Command finished: exit=${result?.exitCode}`)
            
            results.push({
              action: action.command,
              success,
              output
            })
          } catch (e) {
            console.error(`[EXEC] ✗ Command failed:`, e)
            results.push({
              action: action.command,
              success: false,
              output: String(e)
            })
          }
        }
      }
    } catch (e) {
      console.error(`[EXEC] Action error:`, e)
      results.push({ action: action.type, success: false, output: String(e) })
    }
  }

  console.log(`[EXEC] Completed. Results: ${results.length}`)
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
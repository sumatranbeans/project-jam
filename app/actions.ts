'use server'

import { Sandbox } from 'e2b'
import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

// ============================================
// Server Command Detection
// ============================================
const SERVER_COMMAND_PATTERNS = [
  /npm\s+run\s+dev/i,
  /npm\s+start/i,
  /yarn\s+dev/i,
  /yarn\s+start/i,
  /pnpm\s+dev/i,
  /pnpm\s+start/i,
  /npx\s+serve/i,
  /npx\s+vite/i,
  /python.*http\.server/i,
  /python.*SimpleHTTPServer/i,
  /node\s+server/i,
  /next\s+dev/i,
]

function isServerCommand(command: string): boolean {
  return SERVER_COMMAND_PATTERNS.some(pattern => pattern.test(command))
}

function detectPort(command: string): number {
  // Check for explicit port in command
  const portMatch = command.match(/(?:--port|--p|-p)\s*(\d+)/) || command.match(/(\d{4})/)
  if (portMatch) {
    const port = parseInt(portMatch[1])
    if (port >= 1000 && port <= 65535) return port
  }
  
  // Default ports by tool
  if (command.includes('vite') || command.includes('npm run dev')) return 5173
  if (command.includes('next')) return 3000
  if (command.includes('serve')) return 3000
  if (command.includes('http.server')) return 8000
  
  return 8080 // fallback
}

// ============================================
// Sandbox Actions
// ============================================
export async function startSandboxAction() {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY })
  return { sandboxId: sandbox.sandboxId }
}

export async function runCommandAction(sandboxId: string, command: string) {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const result = await sandbox.commands.run(command)
  return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }
}

export async function listFilesAction(sandboxId: string, path: string = '.') {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const files = await sandbox.files.list(path)
  return { files: files.map(f => f.name) }
}

// ============================================
// File Read Action (for inline view/download)
// ============================================
export async function readFileAction(sandboxId: string, filePath: string) {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  try {
    const content = await sandbox.files.read(filePath)
    return { success: true, content }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// ============================================
// Reset Actions (Safety Trigger #1)
// ============================================
export async function purgeDirectoryAction(sandboxId: string, targetPath: string) {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const result = await sandbox.commands.run(`rm -rf ${targetPath}`)
  return { success: result.exitCode === 0, output: result.stderr || result.stdout }
}

export async function fullResetAction() {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY })
  return { sandboxId: sandbox.sandboxId }
}

// ============================================
// GitHub Actions
// ============================================
export async function createRepoAction(name: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const keys = await getApiKeys(userId)
  if (!keys.github) throw new Error('GitHub not connected')
  
  const { createRepo, getUser } = await import('@/lib/github')
  const user = await getUser(keys.github)
  const repo = await createRepo(keys.github, name, true)
  
  return { repoUrl: repo.html_url, owner: user.login, name: repo.name, cloneUrl: repo.clone_url }
}

export async function commitFilesAction(
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const keys = await getApiKeys(userId)
  if (!keys.github) throw new Error('GitHub not connected')
  
  const { commitAndPush } = await import('@/lib/github')
  const commit = await commitAndPush(keys.github, owner, repo, files, message)
  
  return { sha: commit.sha, message: commit.message }
}

// ============================================
// Orchestrator Actions
// ============================================
export async function orchestrateAction(userIntent: string, sandboxId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const keys = await getApiKeys(userId)
  if (!keys.anthropic) throw new Error('Anthropic key not configured')
  if (!keys.google) throw new Error('Google key not configured')

  const { orchestrate } = await import('@/lib/orchestrator')
  
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const files = await sandbox.files.list('.')
  const fileTree = files.map(f => f.name)

  // Pass sandboxId for environment context injection
  const result = await orchestrate(keys.anthropic, keys.google, userIntent, sandboxId, fileTree)
  return result
}

export async function orchestrateFixAction(
  originalIntent: string,
  failedActions: { action: string; error: string }[],
  sandboxId: string,
  attemptNumber: number,
  silentRetryCount: number = 0
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const keys = await getApiKeys(userId)
  if (!keys.anthropic) throw new Error('Anthropic key not configured')
  if (!keys.google) throw new Error('Google key not configured')

  const { orchestrateFix } = await import('@/lib/orchestrator')
  
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  const files = await sandbox.files.list('.')
  const fileTree = files.map(f => f.name)

  // Pass sandboxId for environment context injection
  const result = await orchestrateFix(
    keys.anthropic,
    keys.google,
    originalIntent,
    failedActions,
    sandboxId,
    fileTree,
    attemptNumber,
    silentRetryCount
  )
  return result
}

// ============================================
// Execute Actions (with background server support)
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
      if (action.type === 'createFile' && action.path && action.content) {
        await sandbox.files.write(action.path, action.content)
        results.push({ action: `Create ${action.path}`, success: true })
      }
      
      if (action.type === 'runCommand' && action.command) {
        // Check if this is a server command that needs background execution
        if (isServerCommand(action.command)) {
          const port = detectPort(action.command)
          const previewUrl = `https://${sandboxId}-${port}.e2b.dev`
          
          // Run in background with nohup, don't wait for it
          const bgCommand = `nohup ${action.command} > /tmp/server.log 2>&1 &`
          await sandbox.commands.run(bgCommand, { timeoutMs: 5000 })
          
          // Give server a moment to start
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          results.push({ 
            action: action.command, 
            success: true, 
            output: `Server starting on port ${port}`,
            previewUrl,
            port
          })
        } else {
          // Regular command - run synchronously
          const result = await sandbox.commands.run(action.command, { timeoutMs: 60000 })
          const success = result.exitCode === 0
          results.push({ action: action.command, success, output: result.stdout || result.stderr })
        }
      }
      
      if (action.type === 'createRepo' && action.name) {
        if (!keys.github) throw new Error('GitHub not connected')
        const { createRepo, getUser } = await import('@/lib/github')
        const user = await getUser(keys.github)
        const repo = await createRepo(keys.github, action.name, true)
        results.push({ action: `Create repo ${action.name}`, success: true, output: repo.html_url })
      }
      
      if (action.type === 'commit' && action.message) {
        const result = await sandbox.commands.run(`git add -A && git commit -m "${action.message}"`)
        const success = result.exitCode === 0
        results.push({ action: `Commit: ${action.message}`, success, output: result.stdout || result.stderr })
      }
    } catch (error) {
      results.push({ action: action.type, success: false, output: String(error) })
    }
  }

  return results
}
'use server'

import { Sandbox } from 'e2b'
import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

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

  const result = await orchestrate(keys.anthropic, keys.google, userIntent, fileTree)
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

  const result = await orchestrateFix(
    keys.anthropic,
    keys.google,
    originalIntent,
    failedActions,
    fileTree,
    attemptNumber,
    silentRetryCount
  )
  return result
}

// ============================================
// Execute Actions
// ============================================
export async function executeActionsAction(
  sandboxId: string,
  actions: { type: string; path?: string; content?: string; command?: string; name?: string; message?: string }[]
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')

  const keys = await getApiKeys(userId)
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY })
  
  const results: { action: string; success: boolean; output?: string }[] = []

  for (const action of actions) {
    try {
      if (action.type === 'createFile' && action.path && action.content) {
        await sandbox.files.write(action.path, action.content)
        results.push({ action: `Create ${action.path}`, success: true })
      }
      
      if (action.type === 'runCommand' && action.command) {
        const result = await sandbox.commands.run(action.command)
        const success = result.exitCode === 0
        results.push({ action: action.command, success, output: result.stdout || result.stderr })
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
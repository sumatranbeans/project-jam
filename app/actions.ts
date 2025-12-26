'use server'

import {
  createSandbox,
  executeCommand,
  writeFile,
  readFile,
  listFiles,
  closeSandbox,
  type SandboxSession,
  type CommandResult,
} from '@/lib/e2b'

export async function startSandboxAction(): Promise<SandboxSession> {
  return createSandbox()
}

export async function runCommandAction(
  sandboxId: string,
  command: string
): Promise<CommandResult> {
  return executeCommand(sandboxId, command)
}

export async function writeFileAction(
  sandboxId: string,
  path: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await writeFile(sandboxId, path, content)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function readFileAction(
  sandboxId: string,
  path: string
): Promise<{ content?: string; error?: string }> {
  try {
    const content = await readFile(sandboxId, path)
    return { content }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function listFilesAction(
  sandboxId: string,
  path?: string
): Promise<{ files?: string[]; error?: string }> {
  try {
    const files = await listFiles(sandboxId, path)
    return { files }
  } catch (error) {
    return { error: String(error) }
  }
}

export async function stopSandboxAction(
  sandboxId: string
): Promise<{ success: boolean }> {
  try {
    await closeSandbox(sandboxId)
    return { success: true }
  } catch {
    return { success: false }
  }
}

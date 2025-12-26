import { Sandbox } from 'e2b'

export type SandboxSession = {
  sandboxId: string
  status: 'active' | 'closed' | 'error'
}

export type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

// Create a new E2B sandbox session
export async function createSandbox(): Promise<SandboxSession> {
  const apiKey = process.env.E2B_API_KEY
  
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured')
  }

  try {
    const sandbox = await Sandbox.create({ apiKey })
    return {
      sandboxId: sandbox.sandboxId,
      status: 'active',
    }
  } catch (error) {
    console.error('Failed to create sandbox:', error)
    throw error
  }
}

// Execute a command in an existing sandbox
export async function executeCommand(
  sandboxId: string,
  command: string
): Promise<CommandResult> {
  const apiKey = process.env.E2B_API_KEY
  
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured')
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey })
    const result = await sandbox.commands.run(command)
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    }
  } catch (error) {
    console.error('Failed to execute command:', error)
    throw error
  }
}

// Write a file to the sandbox
export async function writeFile(
  sandboxId: string,
  path: string,
  content: string
): Promise<void> {
  const apiKey = process.env.E2B_API_KEY
  
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured')
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey })
    await sandbox.files.write(path, content)
  } catch (error) {
    console.error('Failed to write file:', error)
    throw error
  }
}

// Read a file from the sandbox
export async function readFile(
  sandboxId: string,
  path: string
): Promise<string> {
  const apiKey = process.env.E2B_API_KEY
  
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured')
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey })
    const content = await sandbox.files.read(path)
    return content
  } catch (error) {
    console.error('Failed to read file:', error)
    throw error
  }
}

// List files in a directory
export async function listFiles(
  sandboxId: string,
  path: string = '/home/user'
): Promise<string[]> {
  const apiKey = process.env.E2B_API_KEY
  
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured')
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey })
    const files = await sandbox.files.list(path)
    return files.map(f => f.name)
  } catch (error) {
    console.error('Failed to list files:', error)
    throw error
  }
}

// Close a sandbox session
export async function closeSandbox(sandboxId: string): Promise<void> {
  const apiKey = process.env.E2B_API_KEY
  
  if (!apiKey) {
    throw new Error('E2B_API_KEY is not configured')
  }

  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey })
    await sandbox.kill()
  } catch (error) {
    console.error('Failed to close sandbox:', error)
    // Don't throw - sandbox might already be closed
  }
}

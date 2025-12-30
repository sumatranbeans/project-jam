// lib/sandbox/types.ts
// The SandboxProvider abstraction - allows swapping CodeSandbox, E2B, Modal, etc.

export interface SandboxSession {
  id: string
  provider: 'codesandbox' | 'e2b' | 'modal'
}

export interface CommandResult {
  success: boolean
  stdout?: string
  stderr?: string
  exitCode?: number
}

export interface PortInfo {
  port: number
  host: string
  previewUrl: string
}

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
}

export interface SandboxProvider {
  // Lifecycle
  create(): Promise<SandboxSession>
  connect(sessionId: string): Promise<void>
  hibernate(): Promise<void>
  kill(): Promise<void>
  
  // File operations
  writeFile(path: string, content: string): Promise<void>
  readFile(path: string): Promise<string>
  listFiles(path?: string): Promise<FileInfo[]>
  
  // Command execution
  run(command: string, options?: { cwd?: string; timeout?: number }): Promise<CommandResult>
  runBackground(command: string, options?: { cwd?: string }): Promise<void>
  
  // Port / Preview
  waitForPort(port: number, timeoutMs?: number): Promise<PortInfo>
  getPreviewUrl(port: number): string
  
  // Session info
  getSessionId(): string | null
}
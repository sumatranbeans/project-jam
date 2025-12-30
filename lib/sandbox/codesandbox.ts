// lib/sandbox/codesandbox.ts
// CodeSandbox SDK implementation - CORRECT API usage
// fs, commands, ports are ALL on the CLIENT (connected session)

import { CodeSandbox } from '@codesandbox/sdk'
import type { SandboxProvider, SandboxSession, CommandResult, PortInfo, FileInfo } from './types'

export class CodeSandboxProvider implements SandboxProvider {
  private sdk: CodeSandbox
  private sandbox: any = null
  private client: any = null  // ALL operations go through client
  private sessionId: string | null = null

  constructor(apiKey?: string) {
    this.sdk = new CodeSandbox(apiKey || process.env.CSB_API_KEY)
  }

  async create(): Promise<SandboxSession> {
    this.sandbox = await this.sdk.sandboxes.create()
    this.sessionId = this.sandbox.id
    this.client = await this.sandbox.connect()
    
    return {
      id: this.sandbox.id,
      provider: 'codesandbox'
    }
  }

  async connect(sessionId: string): Promise<void> {
    this.sandbox = await this.sdk.sandboxes.resume(sessionId)
    this.sessionId = sessionId
    this.client = await this.sandbox.connect()
  }

  async hibernate(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.hibernate()
    }
  }

  async kill(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.shutdown()
    }
    this.sandbox = null
    this.client = null
    this.sessionId = null
  }

  getSessionId(): string | null {
    return this.sessionId
  }

  // ============================================
  // File operations - ALL use client.fs
  // ============================================
  async writeFile(path: string, content: string): Promise<void> {
    if (!this.client) throw new Error('Client not connected')
    await this.client.fs.writeTextFile(path, content)
  }

  async readFile(path: string): Promise<string> {
    if (!this.client) throw new Error('Client not connected')
    return await this.client.fs.readTextFile(path)
  }

  async listFiles(path: string = '.'): Promise<FileInfo[]> {
    if (!this.client) throw new Error('Client not connected')
    
    try {
      const entries = await this.client.fs.readdir(path)
      if (!entries || !Array.isArray(entries)) {
        return []
      }
      return entries.map((entry: any) => ({
        name: entry?.name || 'unknown',
        path: `${path}/${entry?.name || 'unknown'}`.replace('./', ''),
        isDirectory: entry?.type === 'directory'
      }))
    } catch (error) {
      console.error('listFiles error:', error)
      return []
    }
  }

  // ============================================
  // Command execution - client.commands
  // ============================================
  async run(command: string, options?: { cwd?: string; timeout?: number }): Promise<CommandResult> {
    if (!this.client) throw new Error('Client not connected')
    
    try {
      const result = await this.client.commands.run(command, {
        cwd: options?.cwd,
        timeout: options?.timeout
      })
      
      return {
        success: result?.exitCode === 0,
        stdout: result?.stdout || '',
        stderr: result?.stderr || '',
        exitCode: result?.exitCode ?? 1
      }
    } catch (error) {
      return {
        success: false,
        stderr: String(error),
        exitCode: 1
      }
    }
  }

  async runBackground(command: string, options?: { cwd?: string }): Promise<void> {
    if (!this.client) throw new Error('Client not connected')
    this.client.commands.runBackground(command, { cwd: options?.cwd })
  }

  // ============================================
  // Port / Preview - client.ports
  // ============================================
  async waitForPort(port: number, timeoutMs: number = 20000): Promise<PortInfo> {
    if (!this.client) throw new Error('Client not connected')
    
    const portInfo = await this.client.ports.waitForPort(port, { timeout: timeoutMs })
    
    return {
      port,
      host: portInfo?.host || `${this.sessionId}-${port}.csb.app`,
      previewUrl: portInfo?.getPreviewUrl?.() || `https://${this.sessionId}-${port}.csb.app`
    }
  }

  getPreviewUrl(port: number): string {
    if (!this.sessionId) throw new Error('No session')
    return `https://${this.sessionId}-${port}.csb.app`
  }
}
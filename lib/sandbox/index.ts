// lib/sandbox/index.ts
// Factory for creating sandbox providers

import type { SandboxProvider } from './types'
import { CodeSandboxProvider } from './codesandbox'

export type SandboxProviderType = 'codesandbox' | 'e2b'

export function createSandboxProvider(type: SandboxProviderType = 'codesandbox'): SandboxProvider {
  switch (type) {
    case 'codesandbox':
      return new CodeSandboxProvider()
    case 'e2b':
      throw new Error('E2B provider deprecated for dev servers. Use CodeSandbox.')
    default:
      throw new Error(`Unknown sandbox provider: ${type}`)
  }
}

// Re-export types
export type { SandboxProvider, SandboxSession, CommandResult, PortInfo, FileInfo } from './types'
export { CodeSandboxProvider } from './codesandbox'
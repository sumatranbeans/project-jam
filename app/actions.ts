'use server'

import { Sandbox } from 'e2b'
import { auth } from '@clerk/nextjs/server'
import { getApiKeys } from '@/lib/vault'

// GitHub Actions
export async function createRepoAction(name: string) {
  const { auth } = await import('@clerk/nextjs/server')
  const { getApiKeys } = await import('@/lib/vault')
  const { createRepo, getUser } = await import('@/lib/github')
  
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const keys = await getApiKeys(userId)
  if (!keys.github) throw new Error('GitHub not connected')
  
  const user = await getUser(keys.github)
  const repo = await createRepo(keys.github, name, true)
  
  return { 
    repoUrl: repo.html_url, 
    owner: user.login, 
    name: repo.name,
    cloneUrl: repo.clone_url 
  }
}

export async function commitFilesAction(
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string
) {
  const { auth } = await import('@clerk/nextjs/server')
  const { getApiKeys } = await import('@/lib/vault')
  const { commitAndPush } = await import('@/lib/github')
  
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  
  const keys = await getApiKeys(userId)
  if (!keys.github) throw new Error('GitHub not connected')
  
  const commit = await commitAndPush(keys.github, owner, repo, files, message)
  
  return { sha: commit.sha, message: commit.message }
}
'use server'
import { auth } from '@clerk/nextjs/server'
import { saveApiKeys, getApiKeys, deleteApiKey, hasCompletedOnboarding, type ApiKeys } from '@/lib/vault'
export async function saveKeysAction(keys: ApiKeys) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  await saveApiKeys(userId, keys)
  return { success: true }
}
export async function getKeysAction() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  const keys = await getApiKeys(userId)
  const masked: Record<string, string> = {}
  for (const [provider, key] of Object.entries(keys)) {
    if (key) { masked[provider] = key.slice(0, 8) + '...' + key.slice(-4) }
  }
  return masked
}
export async function deleteKeyAction(provider: keyof ApiKeys) {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  await deleteApiKey(userId, provider)
  return { success: true }
}
export async function checkOnboardingAction() {
  const { userId } = await auth()
  if (!userId) return { completed: false }
  const completed = await hasCompletedOnboarding(userId)
  return { completed }
}

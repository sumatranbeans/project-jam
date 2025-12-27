import { Redis } from '@upstash/redis'
import CryptoJS from 'crypto-js'
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})
const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY || process.env.CLERK_SECRET_KEY!
function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
}
function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}
export type ApiKeys = {
  anthropic?: string
  google?: string
  openai?: string
  e2b?: string
  github?: string
}
export async function saveApiKeys(userId: string, keys: ApiKeys): Promise<void> {
  const encrypted: Record<string, string> = {}
  for (const [provider, key] of Object.entries(keys)) {
    if (key) { encrypted[provider] = encrypt(key) }
  }
  await redis.hset(`user:${userId}:keys`, encrypted)
}
export async function getApiKeys(userId: string): Promise<ApiKeys> {
  const encrypted = await redis.hgetall(`user:${userId}:keys`)
  if (!encrypted) return {}
  const decrypted: ApiKeys = {}
  for (const [provider, ciphertext] of Object.entries(encrypted)) {
    if (typeof ciphertext === 'string') {
      decrypted[provider as keyof ApiKeys] = decrypt(ciphertext)
    }
  }
  return decrypted
}
export async function deleteApiKey(userId: string, provider: keyof ApiKeys): Promise<void> {
  await redis.hdel(`user:${userId}:keys`, provider)
}
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const keys = await getApiKeys(userId)
  return !!(keys.anthropic && keys.google)
}

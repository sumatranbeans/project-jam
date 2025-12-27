'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Trash2, Check, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import { getKeysAction, saveKeysAction, deleteKeyAction } from '../vault-actions'
const providers = [
  { id: 'anthropic', name: 'Anthropic (Claude)', placeholder: 'sk-ant-...', help: 'console.anthropic.com' },
  { id: 'google', name: 'Google AI (Gemini)', placeholder: 'AIza...', help: 'aistudio.google.com' },
  { id: 'e2b', name: 'E2B (Sandbox)', placeholder: 'e2b_...', help: 'e2b.dev/dashboard' },
  { id: 'openai', name: 'OpenAI (Optional)', placeholder: 'sk-...', help: 'platform.openai.com' },
]
export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({})
  const [newKeys, setNewKeys] = useState<Record<string, string>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  useEffect(() => { loadKeys() }, [])
  const loadKeys = async () => {
    try { const keys = await getKeysAction(); setSavedKeys(keys) } catch (error) { console.error('Failed to load keys:', error) } finally { setLoading(false) }
  }
  const handleSave = async (provider: string) => {
    if (!newKeys[provider]) return
    setSaving(true)
    try { await saveKeysAction({ [provider]: newKeys[provider] }); await loadKeys(); setNewKeys({ ...newKeys, [provider]: '' }) } catch (error) { console.error('Failed to save key:', error) } finally { setSaving(false) }
  }
  const handleDelete = async (provider: string) => {
    if (!confirm(`Delete ${provider} API key?`)) return
    try { await deleteKeyAction(provider as any); await loadKeys() } catch (error) { console.error('Failed to delete key:', error) }
  }
  if (loading) { return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div> }
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Workspace</button>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">API Keys</h1>
          <p className="text-gray-500 mb-8">Manage your AI provider credentials. Keys are encrypted at rest.</p>
          <div className="space-y-6">
            {providers.map((provider) => (
              <div key={provider.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="font-medium text-gray-900"><Key className="w-4 h-4 inline mr-2 text-gray-400" />{provider.name}</label>
                  {savedKeys[provider.id] && <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Connected</span>}
                </div>
                {savedKeys[provider.id] ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm text-gray-600">{savedKeys[provider.id]}</code>
                    <button onClick={() => handleDelete(provider.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input type={showKey[provider.id] ? 'text' : 'password'} value={newKeys[provider.id] || ''} onChange={(e) => setNewKeys({ ...newKeys, [provider.id]: e.target.value })} placeholder={provider.placeholder} className="w-full px-3 py-2 border border-gray-300 rounded-lg pr-10" />
                      <button type="button" onClick={() => setShowKey({ ...showKey, [provider.id]: !showKey[provider.id] })} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">{showKey[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <button onClick={() => handleSave(provider.id)} disabled={!newKeys[provider.id] || saving} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</button>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">Get it from {provider.help}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

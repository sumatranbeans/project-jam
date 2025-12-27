'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Key, Check, ArrowRight, Loader2, Github } from 'lucide-react'
import { saveKeysAction, getKeysAction } from '../vault-actions'

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [githubConnected, setGithubConnected] = useState(false)
  const [keys, setKeys] = useState({ anthropic: '', google: '', e2b: '' })

  useEffect(() => {
    if (searchParams.get('github') === 'connected') {
      setGithubConnected(true)
      setStep(4)
    }
    checkExistingKeys()
  }, [searchParams])

  const checkExistingKeys = async () => {
    try {
      const existing = await getKeysAction()
      if (existing.github) setGithubConnected(true)
    } catch (e) {}
  }

  const handleSaveKeys = async () => {
    setLoading(true)
    try {
      await saveKeysAction(keys)
      setStep(4)
    } catch (error) {
      console.error('Failed to save keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGithub = () => {
    window.location.href = '/api/auth/github'
  }

  const handleComplete = () => {
    router.push('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-lg w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-blue-500 flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Welcome to Project Jam</h1>
        <p className="text-gray-500 text-center mb-8">Connect your AI providers to start building.</p>
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (<div key={s} className={`w-3 h-3 rounded-full ${s <= step ? 'bg-amber-500' : 'bg-gray-200'}`} />))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Key className="w-4 h-4 inline mr-2" />Anthropic API Key (Claude)</label>
              <input type="password" value={keys.anthropic} onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })} placeholder="sk-ant-..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
              <p className="text-xs text-gray-400 mt-1">Get it from console.anthropic.com</p>
            </div>
            <button onClick={() => setStep(2)} disabled={!keys.anthropic} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">Next <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Key className="w-4 h-4 inline mr-2" />Google AI API Key (Gemini)</label>
              <input type="password" value={keys.google} onChange={(e) => setKeys({ ...keys, google: e.target.value })} placeholder="AIza..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
              <p className="text-xs text-gray-400 mt-1">Get it from aistudio.google.com</p>
            </div>
            <button onClick={() => setStep(3)} disabled={!keys.google} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">Next <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"><Key className="w-4 h-4 inline mr-2" />E2B API Key (Sandbox)</label>
              <input type="password" value={keys.e2b} onChange={(e) => setKeys({ ...keys, e2b: e.target.value })} placeholder="e2b_..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
              <p className="text-xs text-gray-400 mt-1">Get it from e2b.dev/dashboard</p>
            </div>
            <button onClick={handleSaveKeys} disabled={!keys.e2b || loading} className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ArrowRight className="w-4 h-4" /></>}</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Github className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              <p className="text-sm text-gray-600">Connect GitHub to auto-save your projects</p>
            </div>
            {githubConnected ? (
              <div className="flex items-center justify-center gap-2 text-green-600 py-3">
                <Check className="w-5 h-5" /> GitHub Connected
              </div>
            ) : (
              <button onClick={handleConnectGithub} className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800">
                <Github className="w-5 h-5" /> Connect GitHub
              </button>
            )}
            <button onClick={handleComplete} className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600">
              <Check className="w-4 h-4" /> {githubConnected ? 'Complete Setup' : 'Skip for Now'}
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400 text-center">Your keys are encrypted and never exposed to the browser.</p>
      </div>
    </main>
  )
}
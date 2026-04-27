'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEmailNotConfirmed(false)
    setResendSent(false)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setEmailNotConfirmed(true)
      } else {
        setError('Email ou mot de passe incorrect.')
      }
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleResend() {
    setResendLoading(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResendLoading(false)
    setResendSent(true)
  }

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-dark mb-1 tracking-tight">Connexion</h1>
      <p className="text-secondary text-sm mb-7">Accédez à votre tableau de bord FreshTrack.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email" required
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="vous@restaurant.fr"
            className="input"
          />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input
            type="password" required
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
          />
        </div>

        {emailNotConfirmed && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3 space-y-2">
            <p>Votre email n'est pas encore confirmé. Vérifiez votre boîte mail.</p>
            {resendSent ? (
              <p className="text-amber-700">Email de confirmation renvoyé ✓</p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-amber-900 font-medium underline hover:no-underline disabled:opacity-50"
              >
                {resendLoading ? 'Envoi…' : 'Renvoyer l\'email de confirmation'}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connexion...</>
          ) : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm text-secondary mt-6">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  )
}

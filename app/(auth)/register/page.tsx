'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      const { error: insertError } = await supabase
        .from('restaurants')
        .insert({ user_id: data.user.id, name: restaurantName, email })
      if (insertError) { setError('Erreur lors de la création du profil.'); setLoading(false); return }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-dark mb-1 tracking-tight">Créer un compte</h1>
      <p className="text-secondary text-sm mb-7">Démarrez gratuitement. Aucune carte bancaire requise.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nom du restaurant</label>
          <input
            type="text" required
            value={restaurantName} onChange={e => setRestaurantName(e.target.value)}
            placeholder="Le Bistrot du Coin"
            className="input"
          />
        </div>
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
          <label className="label">Mot de passe <span className="text-secondary font-normal">(8 caractères min.)</span></label>
          <input
            type="password" required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création...</>
          ) : 'Créer mon compte gratuitement'}
        </button>
      </form>

      <p className="text-center text-sm text-secondary mt-6">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}

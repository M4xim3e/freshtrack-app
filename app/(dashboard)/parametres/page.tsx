'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function ParametresPage() {
  const supabase = createClient()
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState('essential')
  const [alertEmail, setAlertEmail] = useState('')
  const [alertDays, setAlertDays] = useState('3')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const { data } = await supabase.from('restaurants').select('*').eq('user_id', user.id).single()
      if (data) {
        setRestaurantName(data.name)
        setPlan(data.plan)
        setAlertEmail(data.alert_email || user.email || '')
        setAlertDays(data.alert_days?.toString() || '3')
      }
    }
    load()
  }, [])

  async function saveRestaurant() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('restaurants')
      .update({ name: restaurantName, alert_email: alertEmail, alert_days: parseInt(alertDays) })
      .eq('user_id', user!.id)
    setSaved('restaurant'); setLoading(false)
    setTimeout(() => setSaved(null), 3000)
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) { alert('Les mots de passe ne correspondent pas.'); return }
    if (newPassword.length < 8) { alert('Minimum 8 caractères.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) alert(error.message)
    else { setSaved('password'); setNewPassword(''); setConfirmPassword('') }
    setLoading(false)
    setTimeout(() => setSaved(null), 3000)
  }

  const SavedBadge = () => (
    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium">
      <CheckCircle size={14} /> Sauvegardé
    </span>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark tracking-tight">Paramètres</h1>
        <p className="text-secondary text-sm mt-0.5">Gérez votre compte et vos préférences.</p>
      </div>

      {/* Restaurant */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-dark">Mon restaurant</h2>
          {saved === 'restaurant' && <SavedBadge />}
        </div>
        <div>
          <label className="label">Nom du restaurant</label>
          <input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Email de connexion</label>
          <input value={email} disabled className="input opacity-60 cursor-not-allowed" />
        </div>
        <div>
          <label className="label">Plan actuel</label>
          <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide
            ${plan === 'pro' ? 'bg-primary text-white' : 'bg-bg text-secondary border border-border'}`}>
            {plan === 'pro' ? '⭐ Pro' : 'Essentiel'}
          </span>
        </div>
        <button onClick={saveRestaurant} disabled={loading} className="btn-primary">Sauvegarder</button>
      </div>

      {/* Alertes */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-dark">Alertes email</h2>
        <div>
          <label className="label">Email de réception des alertes</label>
          <input type="email" value={alertEmail} onChange={e => setAlertEmail(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Alerter {alertDays} jour(s) avant la DLC</label>
          <input type="range" min="1" max="7" value={alertDays}
            onChange={e => setAlertDays(e.target.value)}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-secondary mt-1">
            <span>1 jour</span><span>7 jours</span>
          </div>
        </div>
        <button onClick={saveRestaurant} disabled={loading} className="btn-primary">Sauvegarder</button>
      </div>

      {/* Mot de passe */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-dark">Changer de mot de passe</h2>
          {saved === 'password' && <SavedBadge />}
        </div>
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="••••••••" className="input" />
        </div>
        <div>
          <label className="label">Confirmer</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••" className="input" />
        </div>
        <button onClick={savePassword} disabled={loading} className="btn-primary">Mettre à jour</button>
      </div>
    </div>
  )
}

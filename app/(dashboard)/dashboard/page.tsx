import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, daysUntilExpiry, getExpiryStatus } from '@/lib/utils'
import ExpiryBadge from '@/components/ExpiryBadge'
import Link from 'next/link'
import { Package, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!restaurant) redirect('/register')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('expiry_date', { ascending: true })

  const all = products ?? []
  const expired = all.filter(p => daysUntilExpiry(p.expiry_date) < 0)
  const urgent  = all.filter(p => { const d = daysUntilExpiry(p.expiry_date); return d >= 0 && d <= 3 })
  const ok      = all.filter(p => daysUntilExpiry(p.expiry_date) > 3)
  const weekAhead = all.filter(p => { const d = daysUntilExpiry(p.expiry_date); return d >= 0 && d <= 7 })
  const recent  = [...all].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,3)

  const stats = [
    { label: 'Total en stock', value: all.length,      icon: Package,       bg: 'bg-bg',             text: 'text-dark' },
    { label: 'Expirés',        value: expired.length,  icon: AlertTriangle, bg: expired.length  ? 'bg-red-50'    : 'bg-bg', text: expired.length  ? 'text-red-600'    : 'text-dark' },
    { label: 'Urgents (≤3j)',  value: urgent.length,   icon: Clock,         bg: urgent.length   ? 'bg-orange-50' : 'bg-bg', text: urgent.length   ? 'text-orange-600' : 'text-dark' },
    { label: 'OK',             value: ok.length,       icon: CheckCircle,   bg: ok.length       ? 'bg-green-50'  : 'bg-bg', text: ok.length       ? 'text-green-600'  : 'text-dark' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark tracking-tight">Bonjour 👋</h1>
        <p className="text-secondary text-sm mt-0.5">Voici l'état de votre stock aujourd'hui.</p>
      </div>

      {/* Alerte urgente */}
      {(expired.length > 0 || urgent.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-red-700 font-semibold text-sm">
              {expired.length > 0 ? `${expired.length} produit(s) expiré(s)` : ''}
              {expired.length > 0 && urgent.length > 0 ? ' · ' : ''}
              {urgent.length > 0 ? `${urgent.length} produit(s) expirent dans moins de 3 jours` : ''}
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              {[...expired, ...urgent].slice(0,3).map(p => p.name).join(', ')}
              {(expired.length + urgent.length) > 3 ? '…' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className={`card p-5 ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-secondary">{label}</span>
              <Icon size={16} className={text} />
            </div>
            <span className={`text-3xl font-bold tracking-tight ${text}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* À surveiller cette semaine */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-dark">À surveiller cette semaine</h2>
          <Link href="/produits" className="text-primary text-sm font-medium hover:underline">
            Voir tout
          </Link>
        </div>
        {weekAhead.length === 0 ? (
          <div className="px-5 py-12 text-center text-secondary text-sm">
            Aucun produit n'expire dans les 7 prochains jours. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-xs text-secondary">
                  <th className="text-left px-5 py-3 font-medium">Produit</th>
                  <th className="text-left px-5 py-3 font-medium">Catégorie</th>
                  <th className="text-left px-5 py-3 font-medium">DLC</th>
                  <th className="text-left px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {weekAhead.map((p, i) => (
                  <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-bg transition-colors ${i % 2 === 0 ? '' : 'bg-bg/40'}`}>
                    <td className="px-5 py-3.5 font-medium text-dark">{p.name}</td>
                    <td className="px-5 py-3.5 text-secondary">{p.category}</td>
                    <td className="px-5 py-3.5 text-secondary">{formatDate(p.expiry_date)}</td>
                    <td className="px-5 py-3.5"><ExpiryBadge expiryDate={p.expiry_date} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Derniers ajoutés */}
      {recent.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-dark">Derniers produits ajoutés</h2>
          </div>
          <div className="divide-y divide-border">
            {recent.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-dark">{p.name}</p>
                  <p className="text-xs text-secondary">{p.category} · Qté : {p.quantity} {p.unit}</p>
                </div>
                <ExpiryBadge expiryDate={p.expiry_date} />
              </div>
            ))}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-4">📦</p>
          <h3 className="font-semibold text-dark mb-2">Votre stock est vide</h3>
          <p className="text-secondary text-sm mb-5">Commencez par scanner vos livraisons ou ajouter des produits manuellement.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/scanner" className="btn-primary">Scanner un produit</Link>
            <Link href="/produits" className="btn-secondary">Ajouter manuellement</Link>
          </div>
        </div>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import ExpiryBadge from '@/components/ExpiryBadge'
import AddProductButton from './AddProductButton'
import DeleteProductButton from './DeleteProductButton'

export default async function ProduitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants').select('id').eq('user_id', user.id).single()
  if (!restaurant) redirect('/register')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('expiry_date', { ascending: true })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark tracking-tight">Mes produits</h1>
          <p className="text-secondary text-sm mt-0.5">{products?.length ?? 0} produit(s) en stock</p>
        </div>
        <AddProductButton restaurantId={restaurant.id} />
      </div>

      <div className="card overflow-hidden">
        {!products || products.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-semibold text-dark mb-1">Aucun produit</p>
            <p className="text-secondary text-sm">Ajoutez votre premier produit ci-dessus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-xs text-secondary">
                  <th className="text-left px-5 py-3 font-medium">Produit</th>
                  <th className="text-left px-5 py-3 font-medium">Code-barres</th>
                  <th className="text-left px-5 py-3 font-medium">Catégorie</th>
                  <th className="text-left px-5 py-3 font-medium">Qté</th>
                  <th className="text-left px-5 py-3 font-medium">DLC</th>
                  <th className="text-left px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/60 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-dark">{p.name}</td>
                    <td className="px-5 py-3.5 text-secondary font-mono text-xs">{p.barcode || '—'}</td>
                    <td className="px-5 py-3.5 text-secondary">{p.category}</td>
                    <td className="px-5 py-3.5 text-secondary">{p.quantity} {p.unit}</td>
                    <td className="px-5 py-3.5 text-secondary whitespace-nowrap">{formatDate(p.expiry_date)}</td>
                    <td className="px-5 py-3.5"><ExpiryBadge expiryDate={p.expiry_date} /></td>
                    <td className="px-5 py-3.5 text-center">
                      <DeleteProductButton productId={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

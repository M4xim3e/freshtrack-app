'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import QuickAddModal, { type FrequentItem } from './QuickAddModal'
import { useRouter } from 'next/navigation'

export default function FrequentProductsSection({
  items,
  restaurantId,
}: {
  items: FrequentItem[]
  restaurantId: string
}) {
  const [selected, setSelected] = useState<FrequentItem | null>(null)
  const router = useRouter()

  if (items.length === 0) return null

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Zap size={15} className="text-primary" />
          <h2 className="font-semibold text-dark text-sm">Produits fréquents</h2>
          <span className="ml-auto text-xs text-secondary">{items.length} produit{items.length > 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y divide-border">
          {items.map(item => (
            <button
              key={item.barcode ?? item.name}
              onClick={() => setSelected(item)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-bg transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-dark">{item.name}</p>
                <p className="text-xs text-secondary mt-0.5">{item.category} · {item.scan_count}× scanné</p>
              </div>
              <span className="text-xs font-medium text-primary bg-primary-light px-2.5 py-1 rounded-full flex-shrink-0 ml-3">
                Ajout rapide
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <QuickAddModal
          product={selected}
          restaurantId={restaurantId}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); router.refresh() }}
        />
      )}
    </>
  )
}

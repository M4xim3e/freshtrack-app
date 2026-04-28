'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Minus, Plus, CheckCircle } from 'lucide-react'

export type FrequentItem = {
  name: string
  barcode: string | null
  category: string
  scan_count: number
}

function formatDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  let out = digits.slice(0, 2)
  if (digits.length >= 3) out += '/' + digits.slice(2, 4)
  if (digits.length >= 5) out += '/' + digits.slice(4, 8)
  return out
}

function toISO(masked: string): string {
  const d = masked.replace(/\D/g, '')
  if (d.length !== 8) return ''
  return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`
}

function todayPlusDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getFullYear()),
  ].join('/')
}

export default function QuickAddModal({
  product,
  restaurantId,
  onClose,
  onSuccess,
}: {
  product: FrequentItem
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [dateMasked, setDateMasked] = useState('')
  const [quantity, setQuantity]     = useState(1)
  const [avgDays, setAvgDays]       = useState<number | null>(null)
  const [loading, setLoading]       = useState(false)
  const [done, setDone]             = useState(false)
  const [error, setError]           = useState('')
  const supabase = createClient()

  const expiryDate = toISO(dateMasked)

  useEffect(() => {
    async function fetchAvg() {
      const base = supabase
        .from('products')
        .select('expiry_date, created_at')
        .eq('restaurant_id', restaurantId)

      const { data } = await (product.barcode
        ? base.eq('barcode', product.barcode)
        : base.eq('name', product.name))

      if (!data || data.length === 0) {
        setAvgDays(7)
        setDateMasked(todayPlusDays(7))
        return
      }

      const sum = data.reduce((acc, p) => {
        const diff = (new Date(p.expiry_date).getTime() - new Date(p.created_at).getTime()) / 86_400_000
        return acc + diff
      }, 0)
      const avg = Math.max(1, Math.round(sum / data.length))
      setAvgDays(avg)
      setDateMasked(todayPlusDays(avg))
    }
    fetchAvg()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!expiryDate) { setError('Date invalide — utilisez le format JJ/MM/AAAA.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.from('products').insert({
      restaurant_id: restaurantId,
      name:          product.name,
      barcode:       product.barcode,
      category:      product.category,
      quantity,
      expiry_date:   expiryDate,
      scan_count:    product.scan_count + 1,
    })
    if (err) { setError("Erreur lors de l'enregistrement."); setLoading(false); return }
    setDone(true)
    setTimeout(onSuccess, 1000)
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-6 md:pb-0">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="text-primary" size={28} />
          </div>
          <p className="font-semibold text-dark">Produit enregistré !</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-6 md:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border">
          <div>
            <p className="text-xs text-secondary font-medium mb-0.5">{product.category}</p>
            <h2 className="font-bold text-dark text-base leading-tight">{product.name}</h2>
            <p className="text-xs text-secondary mt-0.5">Scanné {product.scan_count}× · ajout rapide</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg mt-0.5 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* DLC */}
          <div>
            <label className="label">Date limite de consommation *</label>
            <input
              value={dateMasked}
              onChange={e => setDateMasked(formatDateMask(e.target.value))}
              placeholder="JJ/MM/AAAA"
              inputMode="numeric"
              maxLength={10}
              className="input tracking-widest"
            />
            {expiryDate && (
              <p className="text-xs text-secondary mt-1.5">
                ✓ {new Date(expiryDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
            {avgDays !== null && (
              <p className="text-xs text-primary mt-1">
                Durée habituelle : {avgDays} jour{avgDays > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="label">Quantité</label>
            <div className="flex items-center border border-border rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-11 h-11 flex items-center justify-center hover:bg-bg border-r border-border"
              >
                <Minus size={16} />
              </button>
              <span className="flex-1 text-center text-lg font-semibold text-dark select-none">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-11 h-11 flex items-center justify-center hover:bg-bg border-l border-border"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button onClick={handleSave} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement…</>
              : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { CATEGORIES } from '@/lib/utils'

export default function AddProductButton({ restaurantId }: { restaurantId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '', barcode: '', category: 'Autre',
    quantity: '1', unit: 'unité',
    expiry_date: '', notes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.from('products').insert({
      restaurant_id: restaurantId,
      name: form.name,
      barcode: form.barcode || null,
      category: form.category,
      quantity: parseInt(form.quantity),
      unit: form.unit,
      expiry_date: form.expiry_date,
      notes: form.notes || null,
    })
    if (error) { setError('Erreur lors de l\'ajout.'); setLoading(false); return }
    setOpen(false)
    setForm({ name:'', barcode:'', category:'Autre', quantity:'1', unit:'unité', expiry_date:'', notes:'' })
    router.refresh()
    setLoading(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <Plus size={16} /> Ajouter un produit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-dark text-lg">Ajouter un produit</h2>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nom du produit *</label>
                  <input required value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="Ex: Filet de boeuf" className="input" />
                </div>
                <div>
                  <label className="label">Code-barres</label>
                  <input value={form.barcode} onChange={e => set('barcode', e.target.value)}
                    placeholder="Optionnel" className="input" />
                </div>
                <div>
                  <label className="label">Catégorie</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)} className="input">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Quantité</label>
                  <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Unité</label>
                  <select value={form.unit} onChange={e => set('unit', e.target.value)} className="input">
                    {['unité','kg','g','L','cl','barquette','sachet','boîte','bouteille'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Date limite de consommation (DLC) *</label>
                  <input required type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className="input" />
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="Optionnel" rows={2} className="input resize-none" />
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Enregistrement…</> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

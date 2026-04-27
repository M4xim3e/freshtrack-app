'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function DeleteProductButton({ productId }: { productId: string }) {
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    await supabase.from('products').delete().eq('id', productId)
    setConfirm(false)
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={handleDelete} className="text-xs text-red-600 font-semibold hover:underline">Confirmer</button>
        <span className="text-border">|</span>
        <button onClick={() => setConfirm(false)} className="text-xs text-secondary hover:underline">Annuler</button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-secondary hover:text-red-500 transition-colors mx-auto"
    >
      <Trash2 size={14} />
    </button>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils'
import { Camera, CheckCircle, X } from 'lucide-react'

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [scanning, setScanning] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [productName, setProductName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [category, setCategory] = useState('Autre')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const startScanner = useCallback(async () => {
    setScanning(true)
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      const deviceId = devices[devices.length - 1]?.deviceId // rear camera on mobile
      controlsRef.current = await reader.decodeFromVideoDevice(deviceId, videoRef.current!, async (result) => {
        if (result) {
          const code = result.getText()
          setBarcode(code)
          navigator.vibrate?.(50)
          stopScanner()

          // Lookup Open Food Facts
          try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
            const data = await res.json()
            if (data.status === 1) {
              const name = data.product?.product_name_fr || data.product?.product_name || ''
              if (name) setProductName(name)
            }
          } catch {}
        }
      })
    } catch {
      setScanning(false)
      setError('Impossible d\'accéder à la caméra. Vérifiez les autorisations.')
    }
  }, [])

  function stopScanner() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setScanning(false)
  }

  useEffect(() => { return () => { controlsRef.current?.stop() } }, [])

  async function handleSave() {
    if (!productName || !expiryDate) { setError('Nom et DLC obligatoires.'); return }
    setLoading(true); setError('')
    const { data: restaurant } = await supabase
      .from('restaurants').select('id').single()
    if (!restaurant) { setError('Profil restaurant introuvable.'); setLoading(false); return }

    const { error: insertError } = await supabase.from('products').insert({
      restaurant_id: restaurant.id,
      name: productName,
      barcode: barcode || null,
      category, quantity: parseInt(quantity),
      expiry_date: expiryDate,
    })
    if (insertError) { setError('Erreur lors de l\'enregistrement.'); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => { router.push('/produits') }, 1500)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="text-primary" size={32} />
        </div>
        <p className="font-semibold text-dark text-lg">Produit enregistré !</p>
        <p className="text-secondary text-sm">Redirection vers vos produits…</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-dark tracking-tight">Scanner un produit</h1>
        <p className="text-secondary text-sm mt-0.5">Scannez le code-barres, entrez la DLC, enregistrez.</p>
      </div>

      {/* Viewfinder */}
      <div className="card overflow-hidden">
        {!scanning && !barcode ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center">
              <Camera className="text-primary" size={28} />
            </div>
            <p className="text-secondary text-sm">La caméra s'ouvre sur votre téléphone</p>
            <button onClick={startScanner} className="btn-primary flex items-center gap-2">
              <Camera size={16} /> Démarrer le scanner
            </button>
          </div>
        ) : scanning ? (
          <div className="relative">
            <video ref={videoRef} className="w-full aspect-video object-cover bg-black" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-32 border-2 border-primary rounded-xl relative">
                <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-lg -translate-x-0.5 -translate-y-0.5" />
                <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-lg translate-x-0.5 -translate-y-0.5" />
                <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-lg -translate-x-0.5 translate-y-0.5" />
                <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-lg translate-x-0.5 translate-y-0.5" />
              </div>
            </div>
            <button onClick={stopScanner}
              className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-5 py-4">
            <CheckCircle className="text-primary flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-medium text-dark">Code détecté</p>
              <p className="text-xs font-mono text-secondary">{barcode}</p>
            </div>
            <button onClick={() => { setBarcode(''); setProductName(''); startScanner() }}
              className="ml-auto text-xs text-secondary hover:text-dark underline">
              Rescanner
            </button>
          </div>
        )}
      </div>

      {/* Form */}
      {(barcode || !scanning) && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Nom du produit *</label>
            <input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="Ex: Filet de boeuf" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">DLC *</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Quantité</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button onClick={handleSave} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Enregistrement…</> : 'Enregistrer dans le stock'}
          </button>
        </div>
      )}
    </div>
  )
}

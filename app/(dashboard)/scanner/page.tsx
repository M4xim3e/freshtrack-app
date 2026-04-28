'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils'
import { Camera, CheckCircle, X, Keyboard, Plus, Minus } from 'lucide-react'

function mapCategory(pnns: string): string {
  const g = (pnns || '').toLowerCase()
  if (g.includes('viande') || g.includes('meat'))                              return 'Viandes'
  if (g.includes('poisson') || g.includes('fish') || g.includes('seafood'))   return 'Poissons'
  if (g.includes('laitier') || g.includes('dairy') || g.includes('milk'))     return 'Produits laitiers'
  if (g.includes('fruit') || g.includes('légume') || g.includes('vegetable')) return 'Fruits & légumes'
  if (g.includes('boisson') || g.includes('beverage') || g.includes('drink')) return 'Boissons'
  if (g.includes('composé') || g.includes('épicerie') || g.includes('snack')) return 'Épicerie'
  if (g.includes('surgelé') || g.includes('frozen'))                          return 'Surgelés'
  return 'Autre'
}

export default function ScannerPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)
  const [scanning, setScanning]               = useState(false)
  const [barcode, setBarcode]                 = useState('')
  const [productName, setProductName]         = useState('')
  const [detectedProduct, setDetectedProduct] = useState<{ name: string; category: string } | null>(null)
  // Date split into 3 numeric fields → easier on mobile
  const [day, setDay]     = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear]   = useState('')
  const [quantity, setQuantity] = useState(1)
  const [category, setCategory] = useState('Autre')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')
  const [manualMode, setManualMode] = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  // Computed ISO date for DB
  const expiryDate = year.length === 4 && month && day
    ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    : ''

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  useEffect(() => {
    return () => { stopScanner() }
  }, [stopScanner])

  async function startScanner() {
    setError('')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 120 } },
        async (decodedText: string) => {
          navigator.vibrate?.(60)
          setBarcode(decodedText)
          await stopScanner()
          await lookupProduct(decodedText)
        },
        () => { /* ignore per-frame errors */ }
      )
      setScanning(true)
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les autorisations ou utilisez la saisie manuelle.")
    }
  }

  async function lookupProduct(code: string) {
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      if (data.status === 1) {
        const product    = data.product
        const name       = product?.product_name_fr || product?.product_name || ''
        const pnns       = product?.pnns_groups_1 || product?.pnns_groups_2 || ''
        const mappedCat  = mapCategory(pnns)
        if (name) {
          setProductName(name)
          setCategory(mappedCat)
          setDetectedProduct({ name, category: mappedCat })
        }
      }
    } catch {}
  }

  async function handleSave() {
    if (!productName)  { setError('Le nom du produit est obligatoire.'); return }
    if (!expiryDate)   { setError('La date limite de consommation est obligatoire.'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non connecté.'); setLoading(false); return }
    const { data: restaurant } = await supabase
      .from('restaurants').select('id').eq('user_id', user.id).single()
    if (!restaurant) { setError('Profil restaurant introuvable.'); setLoading(false); return }
    const { error: insertError } = await supabase.from('products').insert({
      restaurant_id: restaurant.id,
      name:          productName,
      barcode:       barcode || null,
      category,
      quantity,
      expiry_date:   expiryDate,
    })
    if (insertError) { setError("Erreur lors de l'enregistrement."); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/produits'), 1500)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="text-primary" size={32} />
        </div>
        <p className="font-semibold text-dark text-lg">Produit enregistré !</p>
        <p className="text-secondary text-sm">Redirection…</p>
      </div>
    )
  }

  const saveButton = (
    <button
      onClick={handleSave}
      disabled={loading}
      className="btn-primary w-full flex items-center justify-center gap-2"
    >
      {loading
        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement…</>
        : 'Enregistrer dans le stock'}
    </button>
  )

  return (
    <div className="-mx-4 -mt-4 md:mx-auto md:mt-0 md:max-w-lg flex flex-col min-h-[calc(100dvh-3.5rem-4rem)] md:min-h-0 md:space-y-5">

      {/* Desktop-only title */}
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold text-dark tracking-tight">Scanner un produit</h1>
        <p className="text-secondary text-sm mt-0.5">Scannez le code-barres ou saisissez-le manuellement.</p>
      </div>

      {/* ── Top section: scanner / camera ── */}
      <div className="flex-shrink-0">
        {/* Mode toggle */}
        <div className="flex gap-2 px-4 pt-4 pb-3 md:px-0 md:pt-0 md:pb-0">
          <button
            onClick={() => { setManualMode(false); setBarcode('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${!manualMode ? 'bg-primary text-white' : 'bg-bg text-secondary hover:text-dark'}`}
          >
            <Camera size={15} /> Scanner
          </button>
          <button
            onClick={() => { setManualMode(true); stopScanner() }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${manualMode ? 'bg-primary text-white' : 'bg-bg text-secondary hover:text-dark'}`}
          >
            <Keyboard size={15} /> Saisie manuelle
          </button>
        </div>

        {/* Camera / Manual area */}
        <div className="md:card md:overflow-hidden">
          {manualMode ? (
            <div className="px-4 pb-4 md:p-5">
              <label className="label">Code-barres (optionnel)</label>
              <input
                value={barcode}
                onChange={e => { setBarcode(e.target.value); if (e.target.value.length > 7) lookupProduct(e.target.value) }}
                placeholder="Ex: 3017620422003"
                className="input font-mono"
                inputMode="numeric"
              />
              <p className="text-xs text-secondary mt-2">
                Tu peux aussi utiliser un lecteur code-barres USB — il tape le code automatiquement.
              </p>
            </div>
          ) : !scanning && !barcode ? (
            <div className="flex flex-col items-center justify-center gap-4 h-[45vw] md:h-auto md:py-14 bg-bg md:bg-transparent">
              <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center">
                <Camera className="text-primary" size={28} />
              </div>
              <button
                onClick={startScanner}
                className="btn-primary flex items-center gap-2"
              >
                <Camera size={16} /> Démarrer le scanner
              </button>
            </div>
          ) : scanning ? (
            <div className="relative">
              {/* html5-qrcode renders into this div */}
              <div id="qr-reader" className="w-full overflow-hidden" style={{ minHeight: '200px' }} />
              {/* Overlay viewfinder */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-32 border-2 border-primary rounded-xl relative">
                  <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl" />
                  <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br" />
                </div>
              </div>
              <button
                onClick={stopScanner}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white z-10"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 md:px-5 py-4">
              <CheckCircle className="text-primary flex-shrink-0" size={20} />
              <div>
                <p className="text-sm font-medium text-dark">Code détecté</p>
                <p className="text-xs font-mono text-secondary">{barcode}</p>
              </div>
              <button
                onClick={() => { setBarcode(''); setProductName(''); setDetectedProduct(null); startScanner() }}
                className="ml-auto text-xs text-secondary hover:text-dark underline"
              >
                Rescanner
              </button>
            </div>
          )}
        </div>

        {/* Green feedback after product detection */}
        {detectedProduct && (
          <div className="mx-4 md:mx-0 mt-3 bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
            <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-green-700 font-semibold text-sm">Produit trouvé !</p>
              <p className="text-green-800 text-base font-semibold mt-0.5">{detectedProduct.name}</p>
              <p className="text-green-600 text-xs mt-0.5">Catégorie détectée : {detectedProduct.category}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom section: form ── */}
      <div className="flex-1 overflow-y-auto md:overflow-visible px-4 md:px-0 pt-4 md:pt-0 pb-4">
        <div className="md:card md:p-5 space-y-4">

          {/* Product name */}
          <div>
            <label className="label">Nom du produit *</label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="Ex: Filet de bœuf"
              className="input"
            />
          </div>

          {/* DLC — 3 numeric inputs: day / month / year */}
          <div>
            <label className="label">Date limite de consommation *</label>
            <div className="flex items-center gap-2">
              <input
                value={day}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setDay(v)
                }}
                placeholder="JJ"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                className="input text-center"
                style={{ width: '4rem' }}
              />
              <span className="text-secondary font-medium">/</span>
              <input
                value={month}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setMonth(v)
                }}
                placeholder="MM"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                className="input text-center"
                style={{ width: '4rem' }}
              />
              <span className="text-secondary font-medium">/</span>
              <input
                value={year}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setYear(v)
                }}
                placeholder="AAAA"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="input text-center flex-1"
              />
            </div>
            {expiryDate && (
              <p className="text-xs text-secondary mt-1.5">
                Date sélectionnée : {new Date(expiryDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Quantity stepper + category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantité</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-bg hover:bg-white text-dark transition-colors flex-shrink-0"
                >
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center text-lg font-semibold text-dark select-none">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-bg hover:bg-white text-dark transition-colors flex-shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {/* Desktop save button */}
          <div className="hidden md:block">{saveButton}</div>
        </div>
      </div>

      {/* Mobile sticky save button */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-border">
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {saveButton}
      </div>
    </div>
  )
}

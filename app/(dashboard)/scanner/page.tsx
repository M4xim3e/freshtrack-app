'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CATEGORIES } from '@/lib/utils'
import { Camera, CheckCircle, X, Keyboard, Plus, Minus, ShieldAlert, Settings, Zap, Share } from 'lucide-react'
import QuickAddModal, { type FrequentItem } from '@/components/QuickAddModal'

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

// ── Camera permission modal ──────────────────────────────────────────────────
function PermissionModal({ onClose, onManual }: { onClose: () => void; onManual: () => void }) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isIOS     = /iphone|ipad|ipod/i.test(ua)
  const isAndroid = /android/i.test(ua)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-6 md:pb-0">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="text-orange-500" size={30} />
          </div>
          <h2 className="text-lg font-bold text-dark text-center">Accès à la caméra requis</h2>
          <p className="text-secondary text-sm text-center mt-2">
            FreshTrack a besoin d&apos;accéder à votre caméra pour scanner les codes-barres.
          </p>
        </div>

        <div className="mx-5 mb-5 bg-bg rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Comment autoriser</p>
          {isIOS ? (
            <>
              <Step n={1} text='Ouvrez "Réglages" sur votre iPhone' />
              <Step n={2} text={`Faites défiler jusqu'à "Safari"`} />
              <Step n={3} text='Appuyez sur "Caméra" → choisissez "Autoriser"' />
              <Step n={4} text="Revenez sur FreshTrack et réessayez" />
            </>
          ) : isAndroid ? (
            <>
              <Step n={1} text='Ouvrez "Réglages" sur votre Android' />
              <Step n={2} text='"Applications" → votre navigateur (Chrome)' />
              <Step n={3} text='"Autorisations" → "Caméra" → Autoriser' />
              <Step n={4} text="Revenez sur FreshTrack et réessayez" />
            </>
          ) : (
            <>
              <Step n={1} text="Ouvrez les paramètres de votre navigateur" />
              <Step n={2} text='Allez dans "Confidentialité et sécurité"' />
              <Step n={3} text="Autorisez la caméra pour ce site" />
              <Step n={4} text="Rechargez la page et réessayez" />
            </>
          )}
        </div>

        <div className="px-5 pb-6 space-y-2">
          <button onClick={onClose} className="btn-primary w-full flex items-center justify-center gap-2">
            <Settings size={15} /> J&apos;ai compris
          </button>
          <button onClick={onManual} className="btn-secondary w-full text-center">
            Passer en saisie manuelle
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-primary-light text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </span>
      <p className="text-sm text-dark">{text}</p>
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)
  const [scanning, setScanning]               = useState(false)
  const [barcode, setBarcode]                 = useState('')
  const [productName, setProductName]         = useState('')
  const [detectedProduct, setDetectedProduct] = useState<{ name: string; category: string } | null>(null)
  const [dateMasked, setDateMasked]           = useState('')
  const [quantity, setQuantity]               = useState(1)
  const [category, setCategory]               = useState('Autre')
  const [loading, setLoading]                 = useState(false)
  const [success, setSuccess]                 = useState(false)
  const [error, setError]                     = useState('')
  const [manualMode, setManualMode]           = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showInstallBanner, setShowInstallBanner]     = useState(false)

  // Frequent products
  const [restaurantId, setRestaurantId]       = useState<string | null>(null)
  const [frequentProducts, setFrequentProducts] = useState<FrequentItem[]>([])
  const [quickAddProduct, setQuickAddProduct] = useState<FrequentItem | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  const expiryDate = toISO(dateMasked)

  // Load restaurant + frequent products on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: rest } = await supabase
        .from('restaurants').select('id').eq('user_id', user.id).single()
      if (!rest) return
      setRestaurantId(rest.id)

      const { data } = await supabase
        .from('products')
        .select('name, barcode, category, scan_count')
        .eq('restaurant_id', rest.id)
        .gte('scan_count', 3)
        .order('scan_count', { ascending: false })

      const seen = new Set<string>()
      const frequent: FrequentItem[] = []
      for (const p of data ?? []) {
        const key = p.barcode || p.name
        if (!seen.has(key)) {
          seen.add(key)
          frequent.push({ name: p.name, barcode: p.barcode ?? null, category: p.category, scan_count: p.scan_count ?? 0 })
          if (frequent.length >= 6) break
        }
      }
      setFrequentProducts(frequent)
    }
    init()
    return () => { stopScanner() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }, [])

  async function startScanner() {
    setError('')

    // Probe permission before launching html5-qrcode
    if (!navigator.mediaDevices?.getUserMedia) {
      setShowPermissionModal(true)
      setShowInstallBanner(true)
      return
    }
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      probe.getTracks().forEach(t => t.stop())
    } catch {
      setShowPermissionModal(true)
      setShowInstallBanner(true)
      return
    }

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
        () => {}
      )
      setScanning(true)
    } catch {
      setError("Impossible d'accéder à la caméra. Utilisez la saisie manuelle.")
    }
  }

  async function lookupProduct(code: string) {
    try {
      const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      if (data.status === 1) {
        const product   = data.product
        const name      = product?.product_name_fr || product?.product_name || ''
        const pnns      = product?.pnns_groups_1 || product?.pnns_groups_2 || ''
        const mappedCat = mapCategory(pnns)
        if (name) {
          setProductName(name)
          setCategory(mappedCat)
          setDetectedProduct({ name, category: mappedCat })
        }
      }
    } catch {}
  }

  async function handleSave() {
    if (!productName) { setError('Le nom du produit est obligatoire.'); return }
    if (!expiryDate)  { setError('La date limite de consommation est obligatoire (format JJ/MM/AAAA).'); return }
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non connecté.'); setLoading(false); return }
    const { data: restaurant } = await supabase
      .from('restaurants').select('id').eq('user_id', user.id).single()
    if (!restaurant) { setError('Profil restaurant introuvable.'); setLoading(false); return }

    // Compute scan_count from previous entries with same barcode
    let scanCount = 1
    if (barcode) {
      const { data: prev } = await supabase
        .from('products')
        .select('scan_count')
        .eq('restaurant_id', restaurant.id)
        .eq('barcode', barcode)
        .order('scan_count', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (prev?.scan_count) scanCount = prev.scan_count + 1
    }

    const { error: insertError } = await supabase.from('products').insert({
      restaurant_id: restaurant.id,
      name:          productName,
      barcode:       barcode || null,
      category,
      quantity,
      expiry_date:   expiryDate,
      scan_count:    scanCount,
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
    <button onClick={handleSave} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
      {loading
        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement…</>
        : 'Enregistrer dans le stock'}
    </button>
  )

  return (
    <>
      {showPermissionModal && (
        <PermissionModal
          onClose={() => setShowPermissionModal(false)}
          onManual={() => { setShowPermissionModal(false); setManualMode(true) }}
        />
      )}

      {quickAddProduct && restaurantId && (
        <QuickAddModal
          product={quickAddProduct}
          restaurantId={restaurantId}
          onClose={() => setQuickAddProduct(null)}
          onSuccess={() => { setQuickAddProduct(null); router.push('/produits') }}
        />
      )}

      <div className="-mx-4 -mt-4 md:mx-auto md:mt-0 md:max-w-lg flex flex-col min-h-[calc(100dvh-3.5rem-4rem)] md:min-h-0 md:space-y-5">

        {/* Desktop-only title */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-dark tracking-tight">Scanner un produit</h1>
          <p className="text-secondary text-sm mt-0.5">Scannez le code-barres ou saisissez-le manuellement.</p>
        </div>

        {/* ── Top section ── */}
        <div className="flex-shrink-0">

          {/* iOS install banner — appears when camera is blocked */}
          {showInstallBanner && (
            <div className="mx-4 md:mx-0 mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <Share size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  Pour utiliser la caméra, ajoutez FreshTrack à votre écran d&apos;accueil.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Sur Safari : appuyez sur le bouton partage{' '}
                  <span className="inline-block">⬆</span>{' '}
                  puis &ldquo;Sur l&apos;écran d&apos;accueil&rdquo;.
                </p>
              </div>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="flex-shrink-0 text-amber-400 hover:text-amber-600"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Frequent products chips */}
          {frequentProducts.length > 0 && (
            <div className="px-4 md:px-0 mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={13} className="text-primary" />
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Produits fréquents</p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {frequentProducts.map(item => (
                  <button
                    key={item.barcode ?? item.name}
                    onClick={() => setQuickAddProduct(item)}
                    className="flex-shrink-0 bg-white border border-border rounded-full px-3 py-1.5 text-xs font-medium text-dark hover:border-primary hover:text-primary transition-colors whitespace-nowrap shadow-sm"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-2 px-4 pb-3 md:px-0 md:pb-0">
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
            ) : (
              <>
                {/*
                  #qr-reader MUST always be in the DOM when in scanner mode —
                  html5-qrcode looks it up by id before scanning starts.
                  We show/hide it with CSS (not conditional rendering).
                */}
                <div className="relative" style={{ display: scanning ? 'block' : 'none' }}>
                  <div id="qr-reader" className="w-full overflow-hidden" style={{ minHeight: '200px' }} />
                  {/* Viewfinder overlay */}
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

                {/* Idle: start button */}
                {!scanning && !barcode && (
                  <div className="flex flex-col items-center justify-center gap-4 h-[45vw] md:h-auto md:py-14 bg-bg md:bg-transparent">
                    <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center">
                      <Camera className="text-primary" size={28} />
                    </div>
                    <button onClick={startScanner} className="btn-primary flex items-center gap-2">
                      <Camera size={16} /> Démarrer le scanner
                    </button>
                    {error && <p className="text-red-500 text-xs text-center max-w-[220px]">{error}</p>}
                  </div>
                )}

                {/* Code detected */}
                {!scanning && barcode && (
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
              </>
            )}
          </div>

          {/* Green feedback */}
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

            <div>
              <label className="label">Nom du produit *</label>
              <input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="Ex: Filet de bœuf"
                className="input"
              />
            </div>

            <div>
              <label className="label">Date limite de consommation *</label>
              <input
                value={dateMasked}
                onChange={e => setDateMasked(formatDateMask(e.target.value))}
                placeholder="JJ/MM/AAAA"
                inputMode="numeric"
                pattern="[0-9/]*"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantité</label>
                <div className="flex items-center border border-border rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center text-dark hover:bg-bg transition-colors border-r border-border flex-shrink-0"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="flex-1 text-center text-lg font-semibold text-dark select-none">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-11 h-11 flex items-center justify-center text-dark hover:bg-bg transition-colors border-l border-border flex-shrink-0"
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
            <div className="hidden md:block">{saveButton}</div>
          </div>
        </div>

        {/* Mobile sticky save button */}
        <div className="md:hidden fixed bottom-above-nav left-0 right-0 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-border">
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          {saveButton}
        </div>
      </div>
    </>
  )
}

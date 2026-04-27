import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

Deno.serve(async () => {
  const today = new Date()
  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + 3)

  // Fetch products expiring in <= 3 days (not yet expired)
  const { data: products, error } = await supabase
    .from('products')
    .select('*, restaurants(name, alert_email, alert_days, alert_logs(product_id, alert_type, sent_at))')
    .gte('expiry_date', today.toISOString().split('T')[0])
    .lte('expiry_date', maxDate.toISOString().split('T')[0])

  if (error) return new Response(JSON.stringify({ error }), { status: 500 })

  // Group by restaurant
  const byRestaurant = new Map<string, { name: string; email: string; products: typeof products }>()
  for (const p of products ?? []) {
    const r = p.restaurants as { name: string; alert_email: string; id: string }
    if (!byRestaurant.has(r.id)) {
      byRestaurant.set(r.id, { name: r.name, email: r.alert_email, products: [] })
    }
    byRestaurant.get(r.id)!.products.push(p)
  }

  let sent = 0
  for (const [restaurantId, { name, email, products: rProducts }] of byRestaurant) {
    if (!email) continue

    const rows = rProducts.map(p => {
      const days = Math.ceil((new Date(p.expiry_date).getTime() - today.getTime()) / 86400000)
      return `<tr>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-weight:500">${p.name}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#6e6e73">${p.category}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#6e6e73">${new Date(p.expiry_date).toLocaleDateString('fr-FR')}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb">
          <span style="background:${days <= 1 ? '#fee2e2' : '#fef3c7'};color:${days <= 1 ? '#dc2626' : '#d97706'};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600">
            ${days === 0 ? "Expire aujourd'hui" : days === 1 ? 'Demain' : `${days} jours`}
          </span>
        </td>
      </tr>`
    }).join('')

    const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,sans-serif">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden">
  <div style="background:#000;padding:32px;text-align:center">
    <div style="font-size:28px;margin-bottom:8px">🌿</div>
    <div style="color:#fff;font-size:24px;font-weight:700">FreshTrack</div>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1d1d1f;margin:0 0 8px;font-size:20px">⚠️ ${rProducts.length} produit(s) expirent bientôt</h2>
    <p style="color:#6e6e73;margin:0 0 24px">Chez <strong>${name}</strong>, les produits suivants approchent de leur date limite :</p>
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6e6e73;text-transform:uppercase;letter-spacing:.05em">Produit</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6e6e73;text-transform:uppercase;letter-spacing:.05em">Catégorie</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6e6e73;text-transform:uppercase;letter-spacing:.05em">DLC</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;color:#6e6e73;text-transform:uppercase;letter-spacing:.05em">Statut</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin-top:32px">
      <a href="${Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://freshtrack-app.vercel.app'}/dashboard"
         style="background:#22c55e;color:#fff;padding:14px 28px;border-radius:999px;font-weight:600;text-decoration:none;font-size:15px">
        Voir mon tableau de bord
      </a>
    </div>
  </div>
  <div style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px">
    FreshTrack by Anovia · <a href="mailto:maximeeck14@gmail.com" style="color:#9ca3af">maximeeck14@gmail.com</a>
  </div>
</div>
</body></html>`

    await resend.emails.send({
      from: 'FreshTrack <alertes@freshtrack.fr>',
      to: email,
      subject: `⚠️ ${rProducts.length} produit(s) expirent bientôt chez ${name}`,
      html,
    })

    // Log
    await supabase.from('alert_logs').insert(
      rProducts.map(p => ({ product_id: p.id, restaurant_id: restaurantId, alert_type: '3_days' }))
    )
    sent++
  }

  return new Response(JSON.stringify({ ok: true, restaurants_alerted: sent }), { status: 200 })
})

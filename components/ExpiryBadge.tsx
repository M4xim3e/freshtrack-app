import { getExpiryStatus, getExpiryLabel } from '@/lib/utils'

export default function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const status = getExpiryStatus(expiryDate)
  const label = getExpiryLabel(expiryDate)

  const styles = {
    expired: 'bg-red-100 text-red-700 border-red-200',
    urgent:  'bg-orange-100 text-orange-700 border-orange-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    ok:      'bg-green-100 text-green-700 border-green-200',
  }

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status]}`}>
      {label}
    </span>
  )
}

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// Note: install clsx and tailwind-merge → npm install clsx tailwind-merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM yyyy', { locale: fr })
}

export function daysUntilExpiry(expiryDate: string): number {
  return differenceInDays(parseISO(expiryDate), new Date())
}

export type ExpiryStatus = 'expired' | 'urgent' | 'warning' | 'ok'

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const days = daysUntilExpiry(expiryDate)
  if (days < 0) return 'expired'
  if (days <= 1) return 'urgent'
  if (days <= 3) return 'warning'
  return 'ok'
}

export function getExpiryLabel(expiryDate: string): string {
  const days = daysUntilExpiry(expiryDate)
  if (days < 0) return `Expiré (${Math.abs(days)}j)`
  if (days === 0) return "Expire aujourd'hui"
  if (days === 1) return 'Expire demain'
  return `${days} jours restants`
}

export const CATEGORIES = [
  'Viandes',
  'Poissons',
  'Produits laitiers',
  'Fruits & légumes',
  'Épicerie',
  'Boissons',
  'Surgelés',
  'Autre',
]

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SwRegister from '@/components/SwRegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FreshTrack – Gestion des DLC pour restaurants',
  description: 'Scannez vos livraisons, suivez vos dates de péremption, recevez des alertes automatiques.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FreshTrack',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FreshTrack" />
      </head>
      <body className={inter.className}>
        {children}
        <SwRegister />
      </body>
    </html>
  )
}

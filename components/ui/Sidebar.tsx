'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Camera, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/produits',   icon: Package,         label: 'Produits' },
  { href: '/scanner',    icon: Camera,          label: 'Scanner' },
  { href: '/parametres', icon: Settings,        label: 'Paramètres' },
]

export default function Sidebar({ restaurantName }: { restaurantName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-60 min-h-screen bg-white border-r border-border flex-col fixed left-0 top-0 z-20">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-base">🌿</span>
            <span className="font-bold text-dark text-lg">FreshTrack</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {links.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                  ${active
                    ? 'bg-primary-light text-primary border-l-[3px] border-primary pl-[9px]'
                    : 'text-secondary hover:bg-bg hover:text-dark'
                  }`}
              >
                <Icon size={17} className={active ? 'text-primary' : 'text-secondary group-hover:text-dark'} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-secondary truncate">Restaurant</p>
              <p className="text-sm font-semibold text-dark truncate">{restaurantName}</p>
            </div>
            <button
              onClick={signOut}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-secondary hover:text-red-500 transition-colors"
              title="Se déconnecter"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation — hidden on desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border flex items-center justify-around h-16 safe-pb">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href} href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors
                ${active ? 'text-primary' : 'text-secondary'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

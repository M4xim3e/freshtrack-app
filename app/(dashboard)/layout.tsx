import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('user_id', user.id)
    .single()

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar restaurantName={restaurant?.name ?? 'Mon restaurant'} />
      <div className="flex-1 ml-60 flex flex-col">
        <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          <div /> {/* page title injected per-page */}
          <span className="text-sm text-secondary capitalize">{today}</span>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

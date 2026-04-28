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
      <div className="flex-1 md:ml-60 flex flex-col pb-16 md:pb-0">
        <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div />
          <span className="text-sm text-secondary capitalize">{today}</span>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

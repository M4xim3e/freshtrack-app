import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existing } = await supabase
          .from('restaurants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from('restaurants').insert({
            user_id: user.id,
            name: user.user_metadata?.restaurant_name ?? 'Mon restaurant',
            email: user.email ?? '',
          })
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}

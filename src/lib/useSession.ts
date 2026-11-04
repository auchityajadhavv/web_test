import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let live = true
    if (!supabase) { setLoading(false); return }
    // Subscription sends INITIAL_SESSION; avoid racing a separate getSession call.
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      if (live) { setSession(value); setLoading(false) }
    })
    return () => { live = false; data.subscription.unsubscribe() }
  }, [])
  return { session, loading }
}

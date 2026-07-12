import { useState, useEffect, useCallback } from 'react'
import { supabase, ensureBorrowerProfile, type User } from '../lib/supabase'

export type AuthLoadState = 'loading' | 'authed' | 'anon'

/**
 * Tracks the Supabase Auth session and the linked borrower profile row.
 * Independent of wallet connection — see useWallet.ts for that.
 */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loadState, setLoadState] = useState<AuthLoadState>('loading')

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setUser(null)
      setLoadState('anon')
      return
    }
    try {
      const profile = await ensureBorrowerProfile()
      setUser(profile)
      setLoadState('authed')
    } catch {
      setUser(null)
      setLoadState('anon')
    }
  }, [])

  useEffect(() => {
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => sub.subscription.unsubscribe()
  }, [load])

  return {
    user,
    loadState,
    isAuthed: loadState === 'authed',
    refresh: load,
  }
}

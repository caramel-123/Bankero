import { useState, useEffect, useCallback } from 'react'
import { supabase, ensureBorrowerProfile, type User } from '../lib/supabase'

export type AuthLoadState = 'loading' | 'authed' | 'anon'

/**
 * Tracks the Supabase Auth session and the linked borrower profile row.
 * Independent of wallet connection — see useWallet.ts for that.
 *
 * Driven entirely by onAuthStateChange rather than a one-off getSession()
 * call: Supabase fires an INITIAL_SESSION event once it has finished
 * checking both localStorage *and* any access_token in the URL hash (the
 * OAuth redirect case) — a manual getSession() on mount can race ahead of
 * that hash-parsing and read "no session yet".
 */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loadState, setLoadState] = useState<AuthLoadState>('loading')

  const loadProfile = useCallback(async () => {
    try {
      const profile = await ensureBorrowerProfile()
      setUser(profile)
      setLoadState(profile ? 'authed' : 'anon')
    } catch {
      setUser(null)
      setLoadState('anon')
    }
  }, [])

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadProfile()
      } else {
        setUser(null)
        setLoadState('anon')
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  return {
    user,
    loadState,
    isAuthed: loadState === 'authed',
    refresh: loadProfile,
  }
}

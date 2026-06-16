import { useState, useEffect, useCallback } from 'react'
import { connectWallet, getWalletPublicKey, checkFreighterInstalled } from '../lib/stellar'
import { upsertUser } from '../lib/supabase'

export type WalletState = 'idle' | 'connecting' | 'connected' | 'error'

export function useWallet() {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [state, setState] = useState<WalletState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null)

  // Check on mount if already connected
  useEffect(() => {
    checkFreighterInstalled().then(setFreighterInstalled)
    getWalletPublicKey().then((key) => {
      if (key) { setPublicKey(key); setState('connected') }
    })
  }, [])

  const connect = useCallback(async () => {
    setState('connecting')
    setError(null)
    try {
      const key = await connectWallet()
      setPublicKey(key)
      setState('connected')
      // Upsert user in Supabase
      await upsertUser(key).catch(() => {}) // non-blocking
    } catch (err: any) {
      let msg: string
      if (err.message === 'FREIGHTER_NOT_INSTALLED') {
        msg = 'Freighter wallet is not installed. Download it at freighter.app'
      } else if (err.message?.toLowerCase().includes('reject') || err.message?.toLowerCase().includes('denied')) {
        msg = 'Connection rejected. Please approve the request in Freighter.'
      } else if (err.message?.toLowerCase().includes('unlock') || err.message?.toLowerCase().includes('locked')) {
        msg = 'Your Freighter wallet is locked. Please unlock it first.'
      } else {
        msg = err.message || 'Failed to connect. Make sure Freighter is installed and unlocked.'
      }
      setError(msg)
      setState('error')
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null)
    setState('idle')
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    if (state === 'error') setState('idle')
  }, [state])

  return { publicKey, state, error, freighterInstalled, connect, disconnect, clearError, isConnected: state === 'connected' }
}

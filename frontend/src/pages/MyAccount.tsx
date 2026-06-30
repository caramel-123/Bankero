import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Save, CheckCircle, Wallet, Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatWallet } from '../lib/stellar'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

export default function MyAccount({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!wallet.publicKey || wallet.isGuest) { setLoading(false); return }
    supabase
      .from('users')
      .select('display_name')
      .eq('wallet_address', wallet.publicKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name)
        setLoading(false)
      })
  }, [wallet.publicKey, wallet.isGuest])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!wallet.publicKey || wallet.isGuest) return
    setSaving(true)
    setError('')
    const name = displayName.trim()
    const { error: err } = await supabase
      .from('users')
      .update({ display_name: name || null })
      .eq('wallet_address', wallet.publicKey)
    if (err) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  function copyAddress() {
    if (!wallet.publicKey) return
    navigator.clipboard.writeText(wallet.publicKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>My Account</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 28 }}>
          Set your display name — it will appear on public reviews and feedback.
        </p>

        {/* Wallet card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
            Connected Wallet
          </div>
          {wallet.isGuest ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F1F5F9', display: 'grid', placeItems: 'center' }}>
                <Wallet size={18} color="#94A3B8" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Guest / Demo Mode</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Connect a real wallet to set your name</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#DCFCE7', display: 'grid', placeItems: 'center' }}>
                <Wallet size={18} color="#16A34A" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wallet.publicKey ? formatWallet(wallet.publicKey) : '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>Stellar Testnet</div>
              </div>
              <button
                onClick={copyAddress}
                className="btn btn-ghost btn-sm"
                style={{ flexShrink: 0, padding: '6px 10px', fontSize: 12 }}
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          )}
        </div>

        {/* Display name form */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
            Display Name
          </div>

          {loading ? (
            <div style={{ height: 44, borderRadius: 10, background: '#E9EEF0', animation: 'pulse 1.5s ease infinite' }} />
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                <User size={16} color="var(--ink-4)" strokeWidth={2} />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={wallet.isGuest ? 'Connect wallet to set name' : 'e.g. Juan dela Cruz'}
                  disabled={wallet.isGuest}
                  maxLength={40}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontSize: 14, color: 'var(--ink)', fontFamily: 'inherit',
                    cursor: wallet.isGuest ? 'not-allowed' : 'text',
                  }}
                />
                {displayName && (
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>{displayName.length}/40</span>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.6, margin: 0 }}>
                Your name will appear next to your feedback on the landing page. Leave blank to show your wallet address instead.
              </p>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#DC2626', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || wallet.isGuest}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, opacity: wallet.isGuest ? 0.5 : 1 }}
              >
                {saved
                  ? <><CheckCircle size={16} /> Saved!</>
                  : saving
                    ? 'Saving...'
                    : <><Save size={15} /> Save Name</>
                }
              </button>
            </form>
          )}
        </div>

        {/* Info card */}
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.15)' }}>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
            Your name is only used for display purposes on public feedback. Your wallet address and financial data remain private.
          </p>
        </div>

      </div>
    </div>
  )
}

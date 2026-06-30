import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { BillerName } from '../types/pop'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const BILLERS: BillerName[] = ['Meralco', 'Maynilad', 'Manila Water', 'PLDT', 'Globe']

const panel = { background: 'var(--panel)', borderRadius: 'var(--r-lg)', padding: 24 }
const label = { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 6, display: 'block' as const }
const input = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
  color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const,
}
const btn = (disabled: boolean) => ({
  width: '100%', padding: '14px 0', borderRadius: 12,
  background: disabled ? 'rgba(22,163,74,.35)' : '#16A34A',
  color: '#fff', fontWeight: 700, fontSize: 15, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 150ms',
  minHeight: 48,
})

export default function POPRegistration({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [biller, setBiller] = useState<BillerName>('Meralco')
  const [accountNumber, setAccountNumber] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')
  const [gcashNumber, setGcashNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!wallet.publicKey || wallet.isGuest) return
    setError('')
    setLoading(true)
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', wallet.publicKey)
        .maybeSingle()
      if (!user) throw new Error('Hindi mahanap ang iyong account. I-connect muli ang wallet.')

      const { error: err } = await supabase.from('utility_accounts').insert({
        user_id: user.id,
        biller_name: biller,
        account_number: accountNumber.trim(),
        service_address: serviceAddress.trim() || null,
        gcash_number: gcashNumber.trim(),
      })
      if (err) {
        if (err.code === '23505') throw new Error(`May registered ka nang ${biller} account.`)
        throw new Error(err.message)
      }
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'May error. Subukan muli.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ ...panel, textAlign: 'center', maxWidth: 420, width: '100%' }}>
        <CheckCircle size={48} color="#16A34A" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Naka-register na!</h2>
        <p style={{ color: 'rgba(255,255,255,.5)', marginBottom: 24 }}>
          Ang iyong {biller} account ay naka-register na. Pwede ka nang mag-submit ng bill at resibo.
        </p>
        <button onClick={() => nav('/pop/submit')} style={btn(false)}>Mag-submit ng Bill</button>
        <button onClick={() => nav('/dashboard')} style={{ ...btn(false), background: 'rgba(255,255,255,.07)', marginTop: 10 }}>Bumalik sa Dashboard</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> Bumalik
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>I-register ang Bill Account</h1>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, marginBottom: 24 }}>
          I-register ang iyong kuryente, tubig, o internet bill para mapatunayan ang regular na bayad.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={panel}>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Uri ng Bill</label>
              <select
                value={biller}
                onChange={e => setBiller(e.target.value as BillerName)}
                style={{ ...input, appearance: 'none' }}
                required
              >
                {BILLERS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Account Number sa Bill</label>
              <input
                style={input}
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="hal. 123-456-789-000"
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Service Address (opsyonal)</label>
              <input
                style={input}
                value={serviceAddress}
                onChange={e => setServiceAddress(e.target.value)}
                placeholder="hal. 123 Rizal St., Maynila"
              />
            </div>

            <div>
              <label style={label}>GCash / Maya Number</label>
              <input
                style={input}
                value={gcashNumber}
                onChange={e => setGcashNumber(e.target.value)}
                placeholder="hal. 09171234567"
                type="tel"
                required
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: '#fca5a5', fontSize: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" style={btn(loading || !accountNumber || !gcashNumber)} disabled={loading || !accountNumber || !gcashNumber}>
            {loading ? 'Sine-save...' : 'I-register ang Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

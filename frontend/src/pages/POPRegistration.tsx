import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GuestActionModal from '../components/GuestActionModal'
import type { BillerName } from '../types/pop'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const BILLERS: BillerName[] = ['Meralco', 'Maynilad', 'Manila Water', 'PLDT', 'Globe']

const fieldLabel = { fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6, display: 'block' as const }
const fieldInput = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
  color: 'var(--ink)', fontSize: 15, outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
}

export default function POPRegistration({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [biller, setBiller] = useState<BillerName>('Meralco')
  const [accountNumber, setAccountNumber] = useState('')
  const [serviceAddress, setServiceAddress] = useState('')
  const [gcashNumber, setGcashNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (wallet.isGuest) { setShowGuestModal(true); return }
    if (!wallet.publicKey) return
    setError('')
    setLoading(true)
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', wallet.publicKey)
        .maybeSingle()
      if (!user) throw new Error('Your account was not found. Please reconnect your wallet.')

      const { error: err } = await supabase.from('utility_accounts').insert({
        user_id: user.id,
        biller_name: biller,
        account_number: accountNumber.trim(),
        service_address: serviceAddress.trim() || null,
        gcash_number: gcashNumber.trim(),
      })
      if (err) {
        if (err.code === '23505') throw new Error(`You already have a registered ${biller} account.`)
        throw new Error(err.message)
      }
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 420, width: '100%', padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DCFCE7', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={36} color="#16A34A" strokeWidth={1.5} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Successfully Registered!</h2>
        <p style={{ color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6 }}>
          Your {biller} account has been registered. You can now submit your bill and receipt.
        </p>
        <button onClick={() => nav('/pop/submit')} className="btn btn-primary" style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Submit Bill</button>
        <button onClick={() => nav('/dashboard')} className="btn btn-ghost" style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 15 }}>Back to Dashboard</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Register Bill Account</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Register your electricity, water, or internet bill to verify regular payments.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={fieldLabel}>Bill Type</label>
              <select
                value={biller}
                onChange={e => setBiller(e.target.value as BillerName)}
                style={{ ...fieldInput, appearance: 'none' }}
                required
              >
                {BILLERS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label style={fieldLabel}>Bill Account Number</label>
              <input
                style={fieldInput}
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="e.g. 123-456-789-000"
                required
              />
            </div>

            <div>
              <label style={fieldLabel}>Service Address <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span></label>
              <input
                style={fieldInput}
                value={serviceAddress}
                onChange={e => setServiceAddress(e.target.value)}
                placeholder="e.g. 123 Rizal St., Manila"
              />
            </div>

            <div>
              <label style={fieldLabel}>GCash / Maya Number</label>
              <input
                style={fieldInput}
                value={gcashNumber}
                onChange={e => setGcashNumber(e.target.value)}
                placeholder="e.g. 09171234567"
                type="tel"
                required
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#DC2626', fontSize: 14 }}>
              {error}
            </div>
          )}

          {showGuestModal && <GuestActionModal onClose={() => setShowGuestModal(false)} />}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, opacity: loading || !accountNumber || !gcashNumber ? 0.5 : 1 }}
            disabled={loading || !accountNumber || !gcashNumber}
          >
            {loading ? 'Saving...' : 'Register Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

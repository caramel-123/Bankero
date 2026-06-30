import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, Mail, ArrowRight, CheckCircle, Chrome } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

interface Props {
  wallet: WalletHook
}

export default function Onboarding({ wallet }: Props) {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const isLender = params.get('role') === 'lender'
  const fromGoogle = params.get('from') === 'google'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // On return from Google OAuth — pull name/email from session
  useEffect(() => {
    if (!fromGoogle) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      const meta = session.user.user_metadata
      const full: string = meta?.full_name ?? meta?.name ?? ''
      const parts = full.trim().split(' ')
      setFirstName(parts[0] ?? '')
      setLastName(parts.slice(1).join(' ') ?? '')
      setEmail(session.user.email ?? '')
    })
  }, [fromGoogle])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fn = firstName.trim()
    const ln = lastName.trim()
    const em = email.trim()
    if (!fn || !ln) return
    setLoading(true)
    setError('')
    try {
      const displayName = `${fn} ${ln}`
      if (isLender) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('No lender session found.')
        const { error: err } = await supabase
          .from('lenders')
          .update({ first_name: fn, last_name: ln, display_name: displayName })
          .eq('auth_user_id', user.id)
        if (err) throw new Error(err.message)
      } else {
        if (!wallet.publicKey || wallet.isGuest) throw new Error('No wallet connected.')
        const { error: err } = await supabase
          .from('users')
          .update({ first_name: fn, last_name: ln, email: em || null, display_name: displayName })
          .eq('wallet_address', wallet.publicKey)
        if (err) throw new Error(err.message)
      }
      setDone(true)
      setTimeout(() => nav(isLender ? '/lender' : '/dashboard'), 1200)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const redirectTo = `${window.location.origin}/onboarding?from=google${isLender ? '&role=lender' : ''}`
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  if (done) return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DCFCE7', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={36} color="#16A34A" strokeWidth={1.5} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>Welcome, {firstName}!</h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>Taking you to your dashboard…</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: '#DCFCE7', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <User size={28} color="#16A34A" strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>One last step</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            Tell us your name so we can personalize your experience.
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* Google button — borrowers only */}
          {!isLender && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  border: '1.5px solid #E2E8F0', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--ink)',
                  opacity: googleLoading ? 0.65 : 1, marginBottom: 20,
                }}
              >
                {googleLoading ? (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #D1D5DB', borderTopColor: '#374151', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <Chrome size={18} strokeWidth={2} color="#4285F4" />
                )}
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                <span style={{ fontSize: 12, color: '#94A3B8' }}>or fill in manually</span>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* First name + Last name side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6 }}>
                  First Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  className="input"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Juan"
                  required
                  maxLength={30}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6 }}>
                  Last Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  className="input"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="dela Cruz"
                  required
                  maxLength={30}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 6 }}>
                Email address
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-4)', marginLeft: 6 }}>optional</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
                <input
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="juan@example.com"
                  type="email"
                  style={{ paddingLeft: 40 }}
                />
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#DC2626', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !firstName.trim() || !lastName.trim()}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 700,
                borderRadius: 12, marginTop: 4,
                opacity: loading || !firstName.trim() || !lastName.trim() ? 0.5 : 1,
              }}
            >
              {loading
                ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                : <><ArrowRight size={16} /> Continue to Dashboard</>
              }
            </button>

            <button
              type="button"
              onClick={() => nav(isLender ? '/lender' : '/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-4)', padding: '4px 0', textAlign: 'center' }}
            >
              Skip for now
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', marginTop: 20, lineHeight: 1.6 }}>
          Your name is only used for display purposes. Your financial data stays private.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

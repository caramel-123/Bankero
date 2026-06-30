import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Wallet, TrendingUp, Lock, Users, Banknote, ShieldCheck,
  AlertCircle, ExternalLink, Eye, EyeOff, UserPlus,
} from 'lucide-react'
import { signInLender, signUpLender } from '../lib/supabase'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

export default function Login({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'borrower' | 'lender'>(
    params.get('role') === 'lender' ? 'lender' : 'borrower'
  )
  const [lenderMode, setLenderMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [lenderLoading, setLenderLoading] = useState(false)
  const [lenderError, setLenderError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)

  // Clear stale wallet error on mount
  useEffect(() => { wallet.clearError() }, [])

  // Redirect borrower on connect
  useEffect(() => {
    if (wallet.isConnected && tab === 'borrower') nav('/dashboard')
  }, [wallet.isConnected])

  async function handleLenderSignIn() {
    if (!email || !password) return
    setLenderLoading(true)
    setLenderError(null)
    try {
      await signInLender(email, password)
      nav('/lender')
    } catch (e: any) {
      setLenderError(e.message ?? 'Sign in failed. Check your email and password.')
    } finally {
      setLenderLoading(false)
    }
  }

  async function handleLenderSignUp() {
    if (!email || !password || !displayName) return
    setLenderLoading(true)
    setLenderError(null)
    try {
      await signUpLender(email, password, displayName)
      setSignupSuccess(true)
    } catch (e: any) {
      setLenderError(e.message ?? 'Sign up failed.')
    } finally {
      setLenderLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', fontFamily: 'var(--font)' }}>

      {/* ── LEFT panel (dark) ─────────────────────────────── */}
      <div className="panel-card login-left" style={{
        width: 420, display: 'flex', flexDirection: 'column',
        padding: '40px 36px', flexShrink: 0, borderRadius: 0,
      }}>
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,197,94,.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <button
          onClick={() => nav('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 52, padding: 0, position: 'relative' }}
        >
          <img src="/bankero-logo.png" alt="Bankero" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'contain' }} />
          <span className="heading" style={{ fontSize: 18, color: '#fff' }}>
            Bank<span style={{ color: 'var(--green-soft)' }}>e</span>ro
          </span>
        </button>

        {/* Score tier ladder preview */}
        <div style={{ position: 'relative', flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 20 }}>
            Loan limits by credit score
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {[
              { range: '300–449', label: 'Starting Out', color: '#DC2626', loan: '₱500' },
              { range: '450–549', label: 'Fair',          color: '#EA580C', loan: '₱1,500' },
              { range: '550–649', label: 'Developing',    color: '#D97706', loan: '₱3,000' },
              { range: '650–749', label: 'Good',          color: '#65A30D', loan: '₱7,500' },
              { range: '750–799', label: 'Trusted',       color: '#16A34A', loan: '₱15,000' },
              { range: '800–849', label: 'Excellent',     color: '#0D9488', loan: '₱25,000' },
              { range: '850',     label: 'Elite',         color: '#6366F1', loan: '₱50,000' },
            ].map(t => (
              <div key={t.range} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', width: 76 }}>{t.range}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', fontWeight: 600, flex: 1 }}>{t.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: t.color }}>{t.loan}</span>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: <Banknote size={15} strokeWidth={2} />, text: 'Build credit without a bank account' },
              { icon: <Users size={15} strokeWidth={2} />, text: 'Get vouched by your community' },
              { icon: <TrendingUp size={15} strokeWidth={2} />, text: 'Score improves with every repayment' },
              { icon: <ShieldCheck size={15} strokeWidth={2} />, text: 'Your wallet, your data, on-chain' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: 'var(--panel-hi)', flexShrink: 0 }}>{icon}</div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.2)', position: 'relative', marginTop: 24 }}>
          Built on Stellar · Soroban Testnet
        </p>
      </div>

      {/* ── RIGHT panel ───────────────────────────────────── */}
      <div className="login-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', padding: 48, overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 className="heading" style={{ fontSize: 30, color: 'var(--ink)', marginBottom: 6 }}>
            Welcome to Bankero
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 32, lineHeight: 1.5 }}>
            Connect your Stellar wallet or sign in as a lender.
          </p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 3, padding: 4, background: 'var(--surface-3)', borderRadius: 'var(--r-lg)', marginBottom: 28 }}>
            {(['borrower', 'lender'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setLenderError(null) }}
                className="btn"
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
                  fontSize: 14, fontWeight: 700, border: 'none',
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--ink)' : 'var(--ink-4)',
                  boxShadow: tab === t ? 'var(--shadow-xs)' : 'none', gap: 7,
                }}
              >
                {t === 'borrower' ? <><Wallet size={13} strokeWidth={2} /> Borrower</> : <><Banknote size={13} strokeWidth={2} /> Lender</>}
              </button>
            ))}
          </div>

          {/* ── BORROWER ── */}
          {tab === 'borrower' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {wallet.error && (
                <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 'var(--r-lg)', background: 'var(--red-tint)', border: '1px solid #FECACA', color: 'var(--red)', fontSize: 14 }}>
                  <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    {wallet.error.includes('not installed') ? (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>Freighter wallet is not installed.</div>
                        <a href="https://freighter.app" target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--red)', textDecoration: 'underline' }}>
                          Download at freighter.app <ExternalLink size={11} strokeWidth={2} />
                        </a>
                      </>
                    ) : wallet.error}
                  </div>
                </div>
              )}
              <button
                onClick={wallet.connect}
                disabled={wallet.state === 'connecting'}
                className="btn btn-primary"
                style={{ width: '100%', padding: '15px 0', fontSize: 16, borderRadius: 'var(--r-lg)', opacity: wallet.state === 'connecting' ? 0.65 : 1 }}
              >
                {wallet.state === 'connecting' ? (
                  <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Connecting…</>
                ) : (
                  <><Wallet size={17} strokeWidth={2} /> Connect Freighter Wallet</>
                )}
              </button>

              {/* Guest mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              </div>
              <button
                onClick={() => { wallet.connectAsGuest(); nav('/dashboard') }}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 'var(--r-lg)',
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  color: '#475569', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Browse as Guest — No wallet needed
              </button>

              <div style={{ display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 'var(--r-md)', background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 13, color: '#1D4ED8' }}>
                <ExternalLink size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>No Freighter? Install it at <a href="https://freighter.app" target="_blank" rel="noreferrer" style={{ color: '#1D4ED8', fontWeight: 700 }}>freighter.app</a></span>
              </div>
            </div>
          )}

          {/* ── LENDER ── */}
          {tab === 'lender' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Sign in / Sign up sub-tabs */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                {(['signin', 'signup'] as const).map(m => (
                  <button key={m} onClick={() => { setLenderMode(m); setLenderError(null); setSignupSuccess(false) }}
                    style={{ flex: 1, padding: '7px 0', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 'var(--r-md)', background: lenderMode === m ? 'var(--panel)' : 'transparent', color: lenderMode === m ? '#fff' : 'var(--ink-4)' }}>
                    {m === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              {signupSuccess ? (
                <div style={{ padding: '20px 18px', borderRadius: 'var(--r-lg)', background: 'var(--green-tint)', border: '1px solid var(--green-border)', fontSize: 14, color: 'var(--green-hi)', lineHeight: 1.6 }}>
                  <strong>Check your email!</strong><br />
                  A confirmation link was sent to <strong>{email}</strong>. Confirm your email then sign in.
                  <button onClick={() => { setSignupSuccess(false); setLenderMode('signin') }} style={{ display: 'block', marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Go to Sign In →
                  </button>
                </div>
              ) : (
                <>
                  {lenderError && (
                    <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 'var(--r-lg)', background: 'var(--red-tint)', border: '1px solid #FECACA', fontSize: 13, color: 'var(--red)' }}>
                      <AlertCircle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                      {lenderError}
                    </div>
                  )}

                  {lenderMode === 'signup' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Display Name</label>
                      <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name or institution" />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Email address</label>
                    <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="input" value={password} onChange={e => setPassword(e.target.value)}
                        placeholder={lenderMode === 'signup' ? 'At least 8 characters' : 'Password'}
                        type={showPw ? 'text' : 'password'}
                        style={{ paddingLeft: 42, paddingRight: 42 }}
                      />
                      <Lock size={14} strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
                      <button onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', display: 'grid', placeItems: 'center' }}>
                        {showPw ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={lenderMode === 'signin' ? handleLenderSignIn : handleLenderSignUp}
                    disabled={lenderLoading || !email || !password || (lenderMode === 'signup' && !displayName)}
                    className="btn"
                    style={{ width: '100%', padding: '14px 0', fontSize: 15, fontWeight: 700, background: 'var(--panel)', color: '#fff', borderRadius: 'var(--r-lg)', marginTop: 4, opacity: lenderLoading ? 0.65 : 1 }}
                  >
                    {lenderLoading ? (
                      <><div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> {lenderMode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                    ) : lenderMode === 'signin' ? (
                      <><Banknote size={16} strokeWidth={2} /> Sign In as Lender</>
                    ) : (
                      <><UserPlus size={16} strokeWidth={2} /> Create Lender Account</>
                    )}
                  </button>

                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
                    Questions?{' '}
                    <a href="mailto:hello@bankero.ph" style={{ color: 'var(--ink-2)', fontWeight: 700 }}>
                      hello@bankero.ph
                    </a>
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

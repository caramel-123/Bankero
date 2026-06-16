import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Wallet, TrendingUp, Lock, Users, Banknote, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

export default function Login({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<'borrower' | 'lender'>(
    params.get('role') === 'lender' ? 'lender' : 'borrower'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Clear any stale error from previous session on mount
  useEffect(() => { wallet.clearError() }, [])

  useEffect(() => {
    if (wallet.isConnected && tab === 'borrower') nav('/dashboard')
  }, [wallet.isConnected])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', fontFamily: 'var(--font)' }}>

      {/* ── LEFT panel (dark) ─────────────────────────────── */}
      <div className="panel-card" style={{
        width: 420, display: 'flex', flexDirection: 'column',
        padding: '40px 36px', flexShrink: 0, borderRadius: 0,
      }}>
        {/* glow */}
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
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center' }}>
            <span style={{ color: 'var(--green-soft)', fontWeight: 900, fontSize: 15 }}>₱</span>
          </div>
          <span className="heading" style={{ fontSize: 18, color: '#fff' }}>
            Bank<span style={{ color: 'var(--green-soft)' }}>e</span>ro
          </span>
        </button>

        {/* Score preview */}
        <div style={{ position: 'relative', flex: 1 }}>
          <div className="score-num" style={{ fontSize: 88, color: '#fff', lineHeight: 1, marginBottom: 12 }}>
            725
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--r-full)', background: 'var(--green)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
              Good
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--r-full)', background: 'rgba(34,197,94,.15)', color: 'var(--panel-hi)', fontSize: 12, fontWeight: 700 }}>
              <TrendingUp size={11} strokeWidth={2.5} /> +12 this month
            </span>
          </div>

          <div className="progress-track" style={{ marginBottom: 6 }}>
            <div className="progress-fill" style={{ width: '78%', background: 'linear-gradient(90deg, var(--green-soft), var(--panel-hi))' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', marginBottom: 36 }}>
            <span>300</span><span>850</span>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: <Banknote size={16} strokeWidth={2} />, text: 'Build credit without a bank account' },
              { icon: <Users size={16} strokeWidth={2} />, text: 'Get vouched by your community' },
              { icon: <Wallet size={16} strokeWidth={2} />, text: 'Access micro-loans up to ₱10,000' },
              { icon: <ShieldCheck size={16} strokeWidth={2} />, text: 'Your data, your wallet, on-chain' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: 'var(--panel-hi)', flexShrink: 0 }}>{icon}</div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,.62)', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', position: 'relative', marginTop: 24 }}>
          Built on Stellar · Soroban Testnet
        </p>
      </div>

      {/* ── RIGHT panel ───────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-2)', padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="stagger-item">
          <h2 className="heading" style={{ fontSize: 30, color: 'var(--ink)', marginBottom: 6 }}>
            Welcome to Bankero
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', marginBottom: 32, lineHeight: 1.5 }}>
            Connect your Stellar wallet or sign in as a lender.
          </p>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', gap: 3, padding: 4,
            background: 'var(--surface-3)', borderRadius: 'var(--r-lg)',
            marginBottom: 28,
          }}>
            {(['borrower', 'lender'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="btn"
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 'var(--r-md)',
                  fontSize: 14, fontWeight: 700, border: 'none',
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--ink)' : 'var(--ink-4)',
                  boxShadow: tab === t ? 'var(--shadow-xs)' : 'none',
                  gap: 7,
                }}
              >
                {t === 'borrower'
                  ? <><Wallet size={13} strokeWidth={2} /> Borrower</>
                  : <><Banknote size={13} strokeWidth={2} /> Lender</>
                }
              </button>
            ))}
          </div>

          {tab === 'borrower' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {wallet.error && (
                <div style={{
                  display: 'flex', gap: 10, padding: '12px 16px',
                  borderRadius: 'var(--r-lg)',
                  background: 'var(--red-tint)', border: '1px solid #FECACA',
                  color: 'var(--red)', fontSize: 14,
                }}>
                  <AlertCircle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    {wallet.error}
                    {wallet.error.includes('not installed') && (
                      <a
                        href="https://freighter.app"
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontWeight: 700, color: 'var(--red)' }}
                      >
                        Download Freighter <ExternalLink size={11} strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={wallet.connect}
                disabled={wallet.state === 'connecting'}
                className="btn btn-primary"
                style={{
                  width: '100%', padding: '15px 0', fontSize: 16,
                  borderRadius: 'var(--r-lg)',
                  opacity: wallet.state === 'connecting' ? 0.65 : 1,
                  cursor: wallet.state === 'connecting' ? 'not-allowed' : 'pointer',
                }}
              >
                {wallet.state === 'connecting' ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                    Connecting…
                  </>
                ) : (
                  <><Wallet size={17} strokeWidth={2} /> Connect Freighter Wallet</>
                )}
              </button>

              <div style={{
                display: 'flex', gap: 10, padding: '11px 14px',
                borderRadius: 'var(--r-md)',
                background: '#EFF6FF', border: '1px solid #BFDBFE',
                fontSize: 13, color: '#1D4ED8',
              }}>
                <ExternalLink size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  No Freighter? Install it at{' '}
                  <a href="https://freighter.app" target="_blank" rel="noreferrer" style={{ color: '#1D4ED8', fontWeight: 700 }}>
                    freighter.app
                  </a>
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    type="password"
                    style={{ paddingLeft: 42 }}
                  />
                  <Lock size={14} strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
                </div>
              </div>
              <button
                onClick={() => nav('/lender')}
                className="btn"
                style={{ width: '100%', padding: '14px 0', fontSize: 15, background: 'var(--panel)', color: '#fff', borderRadius: 'var(--r-lg)', marginTop: 4 }}
              >
                <Banknote size={16} strokeWidth={2} /> Sign In as Lender
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
                Contact{' '}
                <a href="mailto:hello@bankero.ph" style={{ color: 'var(--ink-2)', fontWeight: 700 }}>
                  hello@bankero.ph
                </a>{' '}
                to become a lender.
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

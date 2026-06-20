import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Users, CreditCard, BarChart2, Settings,
  LogOut, Check, X, Banknote, TrendingUp, AlertCircle,
  Clock, Save, RefreshCw, Lock, Shield, ExternalLink,
} from 'lucide-react'
import {
  formatPeso, formatWallet, scoreTier, scorePercent, stellarExplorerUrl,
  connectWallet, disburseXlmPayment, pesoToXlm,
} from '../lib/stellar'
import { fetchAllLoans, updateLoanStatus, computeLocalScore, type LocalLoan } from '../lib/loanStore'
import {
  getCurrentLenderSession, signOutLender, updateLenderSettings,
  getScoreCacheFromSupabase, type Lender,
} from '../lib/supabase'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

// ── Borrower Profile Modal ────────────────────────────────
interface BorrowerProfile {
  wallet: string
  score: number
  repayment: number
  totalLoans: number
  loansRepaid: number
  loansDefaulted: number
  loans: LocalLoan[]
}

function BorrowerProfileModal({ profile, onClose }: { profile: BorrowerProfile; onClose: () => void }) {
  const tier = scoreTier(profile.score)
  const pct  = scorePercent(profile.score)
  const bars = [
    { label: 'Repayment History', value: profile.repayment, color: '#16A34A' },
    { label: 'Loan Activity',     value: Math.min(100, profile.totalLoans * 10), color: '#3B82F6' },
  ]

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90dvh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', marginBottom: 4 }}>{formatWallet(profile.wallet)}</p>
            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 999, background: tier.color, color: '#fff', fontSize: 12, fontWeight: 700 }}>{tier.label}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="score-num" style={{ fontSize: 48, color: tier.color, lineHeight: 1 }}>{profile.score}</div>
            <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>Credit Score</p>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Score bar */}
          <div style={{ marginBottom: 20 }}>
            <div className="progress-track" style={{ marginBottom: 6 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tier.color}, #4ADE80)` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', fontWeight: 700 }}>
              <span>300</span><span>850</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', border: '1px solid var(--border-2)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            {[
              { label: 'Total Loans',  value: profile.totalLoans },
              { label: 'Repaid',       value: profile.loansRepaid },
              { label: 'Defaulted',    value: profile.loansDefaulted },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border-2)' : 'none' }}>
                <div className="score-num" style={{ fontSize: 24, color: s.label === 'Defaulted' && s.value > 0 ? '#DC2626' : 'var(--ink)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Score breakdown bars */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Score Breakdown</p>
            {bars.map(b => (
              <div key={b.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{b.label}</span>
                  <span className="score-num" style={{ fontSize: 12, color: 'var(--ink)' }}>{b.value}/100</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${b.value}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Loan history */}
          {profile.loans.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 10 }}>Loan History</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.loans.map(loan => (
                  <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{formatPeso(loan.amount)}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{loan.purpose} · {loan.term}d · {new Date(loan.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: '2-digit' })}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                      background: { Repaid: '#F0FDF4', Defaulted: '#FEF2F2', Disbursed: '#EFF6FF', Pending: '#FEF3C7', Approved: '#EFF6FF', Rejected: '#F1F5F9' }[loan.status] ?? '#F1F5F9',
                      color:      { Repaid: '#16A34A', Defaulted: '#DC2626', Disbursed: '#3B82F6', Pending: '#D97706', Approved: '#3B82F6', Rejected: '#6B7280' }[loan.status] ?? '#6B7280',
                    }}>{loan.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: explorer link + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <a href={stellarExplorerUrl(profile.wallet)} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--green)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'}>
              <ExternalLink size={11} strokeWidth={2} /> View on Stellar Explorer
            </a>
            <button onClick={onClose} className="btn btn-ghost btn-sm">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PAGES = [
  { id: 'Dashboard', Icon: Home },
  { id: 'Loans',     Icon: CreditCard },
  { id: 'Reports',   Icon: BarChart2 },
  { id: 'Settings',  Icon: Settings },
]

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    Pending:   { color: '#D97706', bg: '#FEF3C7' },
    Approved:  { color: '#3B82F6', bg: '#EFF6FF' },
    Disbursed: { color: '#15803D', bg: '#F0FDF4' },
    Repaid:    { color: '#6B7280', bg: '#F1F5F9' },
    Defaulted: { color: '#DC2626', bg: '#FEF2F2' },
    Rejected:  { color: '#6B7280', bg: '#F1F5F9' },
  }
  const c = cfg[status] ?? cfg.Pending
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: c.bg, color: c.color }}>{status}</span>
  )
}

export default function LenderDashboard({ wallet: _ }: { wallet: WalletHook }) {
  const nav  = useNavigate()
  const [page, setPage]   = useState('Dashboard')
  const [loans, setLoans] = useState<LocalLoan[]>([])
  const [lender, setLender] = useState<Lender | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loansLoading, setLoansLoading] = useState(true)

  // Lender's Freighter wallet (for signing real XLM payments)
  const [lenderWalletAddr, setLenderWalletAddr] = useState<string | null>(null)
  const [disbursingId, setDisbursingId] = useState<string | null>(null)
  const [disburseError, setDisburseError] = useState<string | null>(null)
  const [disburseTxHash, setDisburseTxHash] = useState<string | null>(null)

  // Settings form state (mirrors lender profile)
  const [maxLoan, setMaxLoan]       = useState(10000)
  const [interestRate, setInterest] = useState(5)
  const [minScore, setMinScore]     = useState(300)
  const [bio, setBio]               = useState('')
  const [settingsSaving, setSaving] = useState(false)
  const [settingsSaved, setSaved]   = useState(false)

  // ── Auth gate: check Supabase session ──────────────────
  useEffect(() => {
    getCurrentLenderSession().then(l => {
      setLender(l)
      setAuthLoading(false)
      if (l) {
        setMaxLoan(l.max_loan_xlm)
        setInterest(l.interest_rate)
        setMinScore(l.min_credit_score)
        setBio(l.bio ?? '')
      }
    })
  }, [])

  async function refreshLoans() {
    setLoansLoading(true)
    const all = await fetchAllLoans()
    setLoans(all)
    setLoansLoading(false)
  }

  useEffect(() => {
    if (lender) refreshLoans()
  }, [lender])

  async function approve(id: string) {
    await updateLoanStatus(id, 'Approved', { lenderWallet: lender?.wallet_address })
    refreshLoans()
  }
  async function reject(id: string) {
    await updateLoanStatus(id, 'Rejected')
    refreshLoans()
  }
  async function disburse(loan: LocalLoan) {
    setDisburseError(null)
    setDisburseTxHash(null)
    setDisbursingId(loan.id)

    try {
      // Step 1: ensure lender has Freighter wallet connected
      let walletAddr = lenderWalletAddr
      if (!walletAddr) {
        walletAddr = await connectWallet()
        setLenderWalletAddr(walletAddr)
      }

      // Step 2: send real XLM payment from lender → borrower
      const txHash = await disburseXlmPayment({
        lenderAddress: walletAddr,
        borrowerAddress: loan.wallet,
        pesoAmount: loan.amount,
        loanId: loan.id,
      })

      setDisburseTxHash(txHash)

      // Step 3: record disbursement in Bankero
      await updateLoanStatus(loan.id, 'Disbursed', { lenderWallet: walletAddr })
      refreshLoans()
    } catch (err: any) {
      const msg = err?.message ?? 'Payment failed'
      if (msg === 'FREIGHTER_NOT_INSTALLED') {
        setDisburseError('Freighter wallet not found. Please install the Freighter browser extension to send XLM.')
      } else if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied')) {
        setDisburseError('Transaction was cancelled in Freighter. No funds were sent.')
      } else {
        setDisburseError(msg)
      }
    } finally {
      setDisbursingId(null)
    }
  }
  async function markDefaulted(id: string) {
    await updateLoanStatus(id, 'Defaulted')
    refreshLoans()
  }
  function isOverdue(loan: LocalLoan) {
    return loan.status === 'Disbursed' && loan.dueAt && new Date(loan.dueAt) < new Date()
  }

  async function saveSettings() {
    if (!lender?.auth_user_id) return
    setSaving(true)
    try {
      const updated = await updateLenderSettings(lender.auth_user_id, {
        max_loan_xlm: maxLoan,
        interest_rate: interestRate,
        min_credit_score: minScore,
        bio,
      })
      setLender(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      alert('Error saving: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOutLender()
    nav('/login?role=lender')
  }

  // ── Borrower profile modal ─────────────────────────────
  const [profile, setProfile] = useState<BorrowerProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState<string | null>(null)

  async function viewProfile(wallet: string) {
    setProfileLoading(wallet)
    try {
      const cache = await getScoreCacheFromSupabase(wallet)
      const repayment = cache?.repayment_score ?? 0
      const score = computeLocalScore(repayment, 0, cache?.loans_repaid && cache.loans_repaid > 0 ? 10 : 0, 0)
      const borrowerLoans = loans.filter(l => l.wallet === wallet)
      setProfile({
        wallet,
        score,
        repayment,
        totalLoans: cache?.total_loans ?? borrowerLoans.length,
        loansRepaid: cache?.loans_repaid ?? borrowerLoans.filter(l => l.status === 'Repaid').length,
        loansDefaulted: cache?.loans_defaulted ?? borrowerLoans.filter(l => l.status === 'Defaulted').length,
        loans: borrowerLoans,
      })
    } catch {
      // Fallback from local loans data
      const borrowerLoans = loans.filter(l => l.wallet === wallet)
      const repayment = 0
      setProfile({
        wallet,
        score: 300,
        repayment,
        totalLoans: borrowerLoans.length,
        loansRepaid: borrowerLoans.filter(l => l.status === 'Repaid').length,
        loansDefaulted: borrowerLoans.filter(l => l.status === 'Defaulted').length,
        loans: borrowerLoans,
      })
    } finally {
      setProfileLoading(null)
    }
  }

  const pending   = loans.filter(l => l.status === 'Pending')
  const approved  = loans.filter(l => l.status === 'Approved')
  const active    = loans.filter(l => l.status === 'Disbursed')
  const repaid    = loans.filter(l => l.status === 'Repaid')
  const defaulted = loans.filter(l => l.status === 'Defaulted')
  const totalDisbursed = [...active, ...repaid, ...defaulted].reduce((s, l) => s + l.amount, 0)
  const defaultRate = [...repaid, ...defaulted].length > 0
    ? Math.round((defaulted.length / (repaid.length + defaulted.length)) * 100)
    : 0

  // ── Not authenticated ──────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2)', fontFamily: 'var(--font)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink-3)' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
          Verifying session…
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!lender) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 'var(--r-xl)', background: 'var(--surface-3)', border: '1.5px solid var(--border)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Lock size={28} strokeWidth={1.5} color="var(--ink-4)" />
          </div>
          <h2 className="heading" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>Lender Access Required</h2>
          <p style={{ color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6 }}>
            You need to sign in as a verified Bankero lender to access this dashboard.
          </p>
          <button onClick={() => nav('/login?role=lender')} className="btn btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 15, borderRadius: 'var(--r-lg)' }}>
            <Shield size={16} strokeWidth={2} /> Sign In as Lender
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)' }}>

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="app-sidebar" style={{ width: 220, background: 'var(--panel)', display: 'flex', flexDirection: 'column', padding: '24px 14px', flexShrink: 0, position: 'sticky', top: 0, height: '100dvh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center' }}>
            <span style={{ color: 'var(--panel-hi)', fontWeight: 900, fontSize: 13 }}>₱</span>
          </div>
          <span className="heading" style={{ fontSize: 16, color: '#fff' }}>Bank<span style={{ color: 'var(--panel-hi)' }}>e</span>ro</span>
        </div>

        {/* Lender badge */}
        <div style={{ padding: '4px 8px 16px' }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(34,197,94,.2)', color: '#4ADE80', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>Lender</span>
        </div>

        {/* Lender name */}
        <div style={{ padding: '8px 10px', marginBottom: 8, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>Signed in as</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lender.display_name}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lender.contact_email}</p>
        </div>

        {PAGES.map(({ id, Icon }) => (
          <button key={id} onClick={() => setPage(id)} className={`sidenav-btn${page === id ? ' active' : ''}`}>
            <Icon size={16} strokeWidth={2} /> {id}
          </button>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleSignOut} className="sidenav-btn">
            <LogOut size={14} strokeWidth={2} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="app-main" style={{ flex: 1, padding: 28, overflowY: 'auto' }}>

        {/* Disburse error banner */}
        {disburseError && (
          <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 'var(--r-lg)', background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 20 }}>
            <AlertCircle size={16} strokeWidth={2} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', margin: '0 0 2px' }}>Disbursement Failed</p>
              <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{disburseError}</p>
            </div>
            <button onClick={() => setDisburseError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 0 }}><X size={14} strokeWidth={2} /></button>
          </div>
        )}

        {/* Disburse success banner */}
        {disburseTxHash && (
          <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 'var(--r-lg)', background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 20 }}>
            <Check size={16} strokeWidth={2.5} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: '0 0 2px' }}>XLM Sent Successfully!</p>
              <p style={{ fontSize: 12, color: '#16A34A', margin: 0, fontFamily: 'var(--font-mono)' }}>TX: {disburseTxHash.slice(0, 20)}…</p>
            </div>
            <button onClick={() => setDisburseTxHash(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A', padding: 0 }}><X size={14} strokeWidth={2} /></button>
          </div>
        )}


        {/* ── DASHBOARD ──────────────────────────────────── */}
        {page === 'Dashboard' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}>Lender Dashboard</h1>
                <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Manage loan applications from real borrowers.</p>
              </div>
              <button onClick={refreshLoans} className="btn btn-ghost btn-sm" disabled={loansLoading}>
                <RefreshCw size={13} strokeWidth={2} style={loansLoading ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
              </button>
            </div>

            {/* Stats row */}
            <div className="card stats-row" style={{ display: 'flex', marginBottom: 20 }}>
              {[
                { label: 'Pending',         value: String(pending.length),     color: '#D97706',      Icon: Clock },
                { label: 'Active Loans',    value: String(active.length),      color: 'var(--green)', Icon: CreditCard },
                { label: 'Total Disbursed', value: formatPeso(totalDisbursed), color: '#3B82F6',      Icon: Banknote },
                { label: 'Default Rate',    value: `${defaultRate}%`,          color: defaultRate > 10 ? '#DC2626' : 'var(--ink)', Icon: AlertCircle },
              ].map((s, i) => {
                const Icon = s.Icon
                return (
                  <div key={s.label} style={{ flex: 1, padding: '18px 22px', borderRight: i < 3 ? '1px solid var(--border-2)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{s.label}</p>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + '12', display: 'grid', placeItems: 'center', color: s.color }}>
                        <Icon size={13} strokeWidth={2} />
                      </div>
                    </div>
                    <p className="score-num" style={{ fontSize: 26, color: s.color }}>{s.value}</p>
                  </div>
                )
              })}
            </div>

            {/* Pending applications */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)' }}>Pending Applications</h3>
                {pending.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#FEF3C7', color: '#D97706' }}>{pending.length} waiting</span>
                )}
              </div>
              {loansLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
                </div>
              ) : pending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                    <CreditCard size={22} strokeWidth={1.5} color="var(--ink-4)" />
                  </div>
                  <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No pending applications right now</p>
                </div>
              ) : pending.map((loan, i) => (
                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < pending.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                  <button onClick={() => viewProfile(loan.wallet)} disabled={profileLoading === loan.wallet}
                    style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
                    title="View borrower profile">
                    {profileLoading === loan.wallet
                      ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
                      : <Users size={16} strokeWidth={2} color="var(--ink-4)" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <button onClick={() => viewProfile(loan.wallet)} style={{ all: 'unset', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 2, display: 'block' }}>{formatWallet(loan.wallet)}</button>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{loan.purpose} · {loan.term} days · Applied {new Date(loan.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginRight: 8 }}>{formatPeso(loan.amount)}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approve(loan.id)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
                      <Check size={13} strokeWidth={2.5} /> Approve
                    </button>
                    <button onClick={() => reject(loan.id)} className="btn btn-sm" style={{ borderRadius: 'var(--r-md)', background: '#FEF2F2', color: '#DC2626', border: 'none' }}>
                      <X size={13} strokeWidth={2.5} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Approved — waiting to disburse */}
            {approved.length > 0 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 16 }}>Approved — Disburse Now</h3>
                {approved.map((loan, i) => (
                  <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < approved.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                    <button onClick={() => viewProfile(loan.wallet)} disabled={profileLoading === loan.wallet}
                      style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
                      title="View borrower profile">
                      {profileLoading === loan.wallet
                        ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #BFDBFE', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite' }} />
                        : <Users size={16} strokeWidth={2} color="#3B82F6" />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <button onClick={() => viewProfile(loan.wallet)} style={{ all: 'unset', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 2, display: 'block' }}>{formatWallet(loan.wallet)}</button>
                      <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{loan.purpose} · {loan.term} days</p>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginRight: 8 }}>{formatPeso(loan.amount)}</p>
                    <button onClick={() => disburse(loan)} disabled={disbursingId === loan.id} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)', opacity: disbursingId === loan.id ? 0.65 : 1 }}>
                      {disbursingId === loan.id
                        ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                        : <><Banknote size={13} strokeWidth={2} /> Disburse {pesoToXlm(loan.amount)} XLM</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LOANS ─────────────────────────────────────── */}
        {page === 'Loans' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)' }}>All Loans</h1>
              <button onClick={refreshLoans} className="btn btn-ghost btn-sm" disabled={loansLoading}>
                <RefreshCw size={13} strokeWidth={2} /> Refresh
              </button>
            </div>
            <div className="card" style={{ padding: 24 }}>
              {loansLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />)}
                </div>
              ) : loans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No loans in the system yet</p>
                </div>
              ) : loans.map((loan, i) => (
                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < loans.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                  <button onClick={() => viewProfile(loan.wallet)} disabled={profileLoading === loan.wallet}
                    style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer' }}
                    title="View borrower profile">
                    {profileLoading === loan.wallet
                      ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
                      : <Users size={16} strokeWidth={2} color="var(--ink-4)" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <button onClick={() => viewProfile(loan.wallet)} style={{ all: 'unset', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 2, display: 'block' }}>{formatWallet(loan.wallet)}</button>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{loan.purpose} · {loan.term} days · {new Date(loan.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{formatPeso(loan.amount)}</p>
                  <StatusPill status={loan.status} />
                  {loan.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => approve(loan.id)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
                        <Check size={12} strokeWidth={2.5} /> Approve
                      </button>
                      <button onClick={() => reject(loan.id)} className="btn btn-sm" style={{ borderRadius: 'var(--r-md)', background: '#FEF2F2', color: '#DC2626', border: 'none' }}>
                        <X size={12} strokeWidth={2.5} /> Reject
                      </button>
                    </div>
                  )}
                  {loan.status === 'Approved' && (
                    <button onClick={() => disburse(loan)} disabled={disbursingId === loan.id} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)', opacity: disbursingId === loan.id ? 0.65 : 1 }}>
                      {disbursingId === loan.id
                        ? <><div style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                        : <><Banknote size={12} strokeWidth={2} /> Disburse {pesoToXlm(loan.amount)} XLM</>}
                    </button>
                  )}
                  {isOverdue(loan) && (
                    <button onClick={() => markDefaulted(loan.id)} className="btn btn-sm" style={{ borderRadius: 'var(--r-md)', background: '#FEF2F2', color: '#DC2626', border: 'none', fontSize: 11 }}>
                      <AlertCircle size={11} strokeWidth={2.5} /> Mark Defaulted
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────────── */}
        {page === 'Reports' && (
          <div>
            <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 24 }}>Reports</h1>
            <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Portfolio Value',  value: formatPeso(totalDisbursed), Icon: Banknote,    color: 'var(--green)' },
                { label: 'Repayment Rate',   value: repaid.length + defaulted.length > 0 ? `${Math.round((repaid.length / (repaid.length + defaulted.length)) * 100)}%` : '—', Icon: TrendingUp, color: '#3B82F6' },
                { label: 'Default Rate',     value: `${defaultRate}%`,           Icon: AlertCircle, color: defaultRate > 10 ? '#DC2626' : 'var(--ink)' },
                { label: 'Total Borrowers',  value: String(new Set(loans.map(l => l.wallet)).size), Icon: Users, color: 'var(--ink)' },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '12', display: 'grid', placeItems: 'center', color }}>
                      <Icon size={15} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{label}</span>
                  </div>
                  <p className="score-num" style={{ fontSize: 32, color: 'var(--ink)' }}>{loansLoading ? '—' : value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────── */}
        {page === 'Settings' && (
          <div>
            <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 6 }}>Settings</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 28 }}>Your lending preferences — saved to your Bankero profile.</p>
            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 720 }}>
              {/* Profile */}
              <div className="card" style={{ padding: 24, gridColumn: '1/-1' }}>
                <h3 className="heading" style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 18 }}>Profile</h3>
                <div className="profile-fields-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Display Name</label>
                    <input className="input" value={lender.display_name} disabled style={{ color: 'var(--ink-3)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Email</label>
                    <input className="input" value={lender.contact_email ?? ''} disabled style={{ color: 'var(--ink-3)' }} />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Bio / Description</label>
                  <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="Tell borrowers about yourself or your institution…" style={{ resize: 'vertical' }} />
                </div>
              </div>

              {/* Lending preferences */}
              <div className="card" style={{ padding: 24 }}>
                <h3 className="heading" style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 18 }}>Max Loan Amount (₱)</h3>
                <input className="input" type="number" value={maxLoan} onChange={e => setMaxLoan(Number(e.target.value))} min={500} max={100000} />
                <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>Maximum ₱ you're willing to lend per borrower</p>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <h3 className="heading" style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 18 }}>Interest Rate (%)</h3>
                <input className="input" type="number" value={interestRate} onChange={e => setInterest(Number(e.target.value))} min={1} max={20} step={0.5} />
                <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>Flat rate applied to the loan principal</p>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <h3 className="heading" style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 18 }}>Minimum Credit Score</h3>
                <input className="input" type="number" value={minScore} onChange={e => setMinScore(Number(e.target.value))} min={300} max={850} />
                <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>Only approve borrowers at or above this score</p>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <button onClick={saveSettings} disabled={settingsSaving} className="btn btn-primary"
                  style={{ padding: '13px 28px', fontSize: 14, borderRadius: 'var(--r-lg)', opacity: settingsSaving ? 0.65 : 1 }}>
                  {settingsSaving
                    ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Saving…</>
                    : settingsSaved
                    ? <><Check size={15} strokeWidth={2.5} /> Saved!</>
                    : <><Save size={15} strokeWidth={2} /> Save Settings</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        {[
          { icon: Home,       label: 'Dashboard', pageId: 'Dashboard' },
          { icon: CreditCard, label: 'Loans',     pageId: 'Loans' },
          { icon: BarChart2,  label: 'Reports',   pageId: 'Reports' },
          { icon: Settings,   label: 'Settings',  pageId: 'Settings' },
        ].map(n => {
          const Icon = n.icon
          const active = page === n.pageId
          return (
            <button key={n.pageId} onClick={() => setPage(n.pageId)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: active ? 'var(--green)' : 'rgba(255,255,255,.4)', fontSize: 9, fontWeight: 700 }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {n.label}
            </button>
          )
        })}
      </nav>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Borrower Profile Modal ──────────────────────── */}
      {profile && <BorrowerProfileModal profile={profile} onClose={() => setProfile(null)} />}
    </div>
  )
}

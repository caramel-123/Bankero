import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Users, CreditCard, BarChart2, UserCircle,
  LogOut, Check, X, Banknote, TrendingUp, AlertCircle,
  Clock, Save, RefreshCw, Lock, Shield, ExternalLink, PiggyBank, Ban,
} from 'lucide-react'
import {
  formatXlmAmount, formatWallet, scoreTier, scorePercent, stellarExplorerUrl,
  connectWallet, disburseXlmPayment, xlmToPesoEstimate, CONTRACT_IDS,
} from '../lib/stellar'
import { fetchAllLoans, updateLoanStatus, computeLocalScore, computeRepaymentScore, getScoreCache, type LocalLoan, type BackingType } from '../lib/loanStore'
import { fetchOnChainScore, fetchBorrowerVouchers, invokeContractWrite, addressLoanIdArgs, ContractWriteError } from '../lib/contracts'
import { computeAnchorScore } from '../lib/anchorStore'
import {
  ensureLenderProfile, signOutLender, updateLenderSettings, getBorrowerNames, type Lender,
} from '../lib/supabase'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

// ── Borrower Profile Modal ────────────────────────────────
interface BorrowerProfile {
  wallet: string
  name: string | null
  score: number
  repayment: number
  tx: number
  vouch: number
  anchor: number
  totalLoans: number
  loansRepaid: number
  loansDefaulted: number
  loans: LocalLoan[]
}

function BorrowerProfileModal({ profile, onClose }: { profile: BorrowerProfile; onClose: () => void }) {
  const tier = scoreTier(profile.score)
  const pct  = scorePercent(profile.score)
  const bars = [
    { label: 'Repayment History (40%)',   value: profile.repayment, color: 'var(--green-soft, #16A34A)' },
    { label: 'Transaction Activity (25%)', value: profile.tx,        color: '#60A5FA' },
    { label: 'Community Vouches (20%)',   value: profile.vouch,     color: '#FBBF24' },
    { label: 'Remittance (15%)',          value: profile.anchor,    color: '#A78BFA' },
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
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>{profile.name ?? formatWallet(profile.wallet)}</p>
            {profile.name && (
              <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', marginBottom: 4 }}>{formatWallet(profile.wallet)}</p>
            )}
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
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{formatXlmAmount(loan.amount)}</p>
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

// ── Approve & disburse confirmation modal ─────────────────
function ApproveConfirmModal({ loan, profile, profileLoading, onCancel, onConfirm, disbursing }: {
  loan: LocalLoan
  profile: BorrowerProfile | null
  profileLoading: boolean
  onCancel: () => void
  onConfirm: () => void
  disbursing: boolean
}) {
  const tier = profile ? scoreTier(profile.score) : null
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,.25)', padding: 28 }}
      >
        <h2 className="heading" style={{ fontSize: 19, color: 'var(--ink)', marginBottom: 4 }}>Approve &amp; Disburse This Loan?</h2>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>Review the borrower and what you'll earn before sending real XLM.</p>

        {/* Borrower status */}
        <div style={{ borderRadius: 14, border: '1px solid var(--border-2)', padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Borrower</p>
          {profileLoading || !profile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 13 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
              Loading borrower status…
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 2px' }}>{profile.name ?? formatWallet(profile.wallet)}</p>
                <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>{profile.totalLoans} loans · {profile.loansRepaid} repaid · {profile.loansDefaulted} defaulted</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="score-num" style={{ fontSize: 22, color: tier?.color }}>{profile.score}</div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: tier?.color, color: '#fff' }}>{tier?.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Financial summary */}
        <div style={{ borderRadius: 14, background: 'var(--green-tint)', border: '1px solid #BBF7D0', padding: '16px 18px', marginBottom: 20 }}>
          {[
            ['Loan principal', loan.amount],
            ['Interest you\'ll earn', loan.interest],
          ].map(([label, xlm]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
              <span style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{formatXlmAmount(xlm as number)}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{xlmToPesoEstimate(xlm as number)}</div>
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #86EFAC', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>You'll receive back if fully repaid</span>
            <span style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#15803D' }}>{formatXlmAmount(loan.total)}</div>
              <div style={{ fontSize: 11, color: '#16A34A' }}>{xlmToPesoEstimate(loan.total)}</div>
            </span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 20, lineHeight: 1.5 }}>
          Confirming sends <strong style={{ color: 'var(--ink)' }}>{formatXlmAmount(loan.amount)}</strong> in real XLM from your connected Freighter wallet to the borrower.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} disabled={disbursing} className="btn" style={{ flex: 1, padding: '13px 0', borderRadius: 'var(--r-lg)', fontSize: 14, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--ink-3)', border: '1.5px solid var(--border)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={disbursing} className="btn btn-primary" style={{ flex: 1, padding: '13px 0', borderRadius: 'var(--r-lg)', fontSize: 14, fontWeight: 700, opacity: disbursing ? 0.65 : 1 }}>
            {disbursing
              ? <><div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Sending…</>
              : <><Banknote size={14} strokeWidth={2} /> Disburse</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

const PAGES = [
  { id: 'Dashboard', Icon: Home },
  { id: 'Loans',     Icon: CreditCard },
  { id: 'Reports',   Icon: BarChart2 },
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

/** Shows a lender at a glance whether a loan has real backing behind it, and how much. */
function BackingBadge({ backingType, backingAmount, vouchTotal }: { backingType: BackingType; backingAmount: number; vouchTotal?: number }) {
  const style = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' as const }
  if (backingType === 'vouch') {
    return (
      <span style={{ ...style, background: '#FEF3C7', color: '#B45309' }}>
        <Users size={11} strokeWidth={2} /> {vouchTotal != null ? `${formatXlmAmount(vouchTotal)} vouched` : 'Vouched'}
      </span>
    )
  }
  if (backingType === 'savings') {
    return (
      <span style={{ ...style, background: '#EFF6FF', color: '#1D4ED8' }}>
        <PiggyBank size={11} strokeWidth={2} /> {formatXlmAmount(backingAmount)} locked
      </span>
    )
  }
  return (
    <span style={{ ...style, background: 'var(--surface-2)', color: 'var(--ink-4)' }}>
      <Ban size={11} strokeWidth={2} /> No backing
    </span>
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
  const [maxLoan, setMaxLoan]       = useState(200)
  const [minScore, setMinScore]     = useState(300)
  const [bio, setBio]               = useState('')
  const [settingsSaving, setSaving] = useState(false)
  const [settingsSaved, setSaved]   = useState(false)

  // Repaid loans this lender has already been shown, so the "Loans" nav
  // badge clears once they've viewed the tab instead of staying lit
  // forever (unlike Pending, "Repaid" is a terminal status that never
  // naturally clears on its own).
  const [seenRepaidIds, setSeenRepaidIds] = useState<Set<string>>(new Set())

  // ── Auth gate: check Supabase session, auto-creating a lender row for
  // fresh Google sign-ins (no explicit signUp step to create one) ──────
  useEffect(() => {
    ensureLenderProfile().then(l => {
      setLender(l)
      setAuthLoading(false)
      if (l) {
        setMaxLoan(l.max_loan_xlm)
        setMinScore(l.min_credit_score)
        setBio(l.bio ?? '')
      }
    }).catch(() => setAuthLoading(false))
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

  // Load which repaid loans this lender has already seen.
  useEffect(() => {
    if (!lender) return
    try {
      const raw = localStorage.getItem(`bankero_lender_seen_repaid_${lender.wallet_address}`)
      setSeenRepaidIds(new Set(raw ? JSON.parse(raw) : []))
    } catch { setSeenRepaidIds(new Set()) }
  }, [lender])

  // Mark this lender's currently-repaid loans as seen once they open the Loans tab.
  useEffect(() => {
    if (!lender || page !== 'Loans') return
    const myRepaidIds = loans.filter(l => l.status === 'Repaid' && l.lenderWallet === lender.wallet_address).map(l => l.id)
    if (myRepaidIds.length === 0) return
    setSeenRepaidIds(prev => {
      if (myRepaidIds.every(id => prev.has(id))) return prev
      const next = new Set(prev)
      myRepaidIds.forEach(id => next.add(id))
      try { localStorage.setItem(`bankero_lender_seen_repaid_${lender.wallet_address}`, JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [page, loans, lender])

  // Borrower names for the loan lists — wallets are pseudonymous, but a
  // borrower's real name is known once they've signed up (see PATCH
  // 1.7.12's login-first flow). Falls back to formatWallet() below for
  // legacy wallet-only rows with no linked profile.
  const [borrowerNames, setBorrowerNames] = useState<Record<string, string>>({})
  useEffect(() => {
    const wallets = loans.map(l => l.wallet)
    if (wallets.length === 0) return
    getBorrowerNames(wallets).then(setBorrowerNames)
  }, [loans])

  // Total XLM vouched per borrower, for the BackingBadge on vouch-backed loans.
  const [vouchTotals, setVouchTotals] = useState<Record<string, number>>({})
  useEffect(() => {
    const vouchBackedWallets = [...new Set(loans.filter(l => l.backingType === 'vouch').map(l => l.wallet))]
    if (vouchBackedWallets.length === 0) return
    Promise.all(vouchBackedWallets.map(async w => {
      const vouchers = await fetchBorrowerVouchers(w)
      const total = vouchers.reduce((s, v) => s + v.stake_amount / 10_000_000, 0)
      return [w, total] as const
    })).then(entries => setVouchTotals(Object.fromEntries(entries)))
  }, [loans])

  async function approve(loan: LocalLoan) {
    // Savings-backed loans need the borrower to lock collateral against a
    // real on-chain lender address before disbursement. `lender.wallet_address`
    // is just a synthetic `lender_<id>` placeholder assigned at signup, real
    // Freighter wallets are normally only captured at disburse() time, so for
    // this backing type we have to connect it here instead, or the borrower's
    // later "Lock Collateral" call fails trying to build an Address from that
    // placeholder string.
    let lenderWallet = lender?.wallet_address
    if (loan.backingType === 'savings') {
      let walletAddr = lenderWalletAddr
      if (!walletAddr) {
        walletAddr = await connectWallet()
        setLenderWalletAddr(walletAddr)
      }
      lenderWallet = walletAddr
    }
    await updateLoanStatus(loan.id, 'Approved', { lenderWallet })
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

      let txHash: string
      if (loan.backingType === 'savings') {
        // Savings-backed loans go through the real on-chain loan_registry —
        // the borrower must have already signed the on-chain apply_loan
        // ("Lock Your Collateral" on their Loan Tracking page) before this
        // loan_id exists on-chain. disburse_loan itself transfers the
        // principal AND locks the collateral, so no separate Horizon
        // payment happens for this path (that would double-pay the borrower).
        if (loan.onchainLoanId == null) {
          throw new Error("The borrower hasn't confirmed their collateral yet. Ask them to lock it from their Loan Tracking page, then try disbursing again.")
        }
        await invokeContractWrite(CONTRACT_IDS.loanRegistry, 'approve_loan', addressLoanIdArgs(walletAddr, loan.onchainLoanId), walletAddr)
        const result = await invokeContractWrite(CONTRACT_IDS.loanRegistry, 'disburse_loan', addressLoanIdArgs(walletAddr, loan.onchainLoanId), walletAddr)
        txHash = result.hash
      } else {
        // Vouch-backed and unbacked loans keep today's behavior: a direct
        // Horizon payment, no on-chain loan_registry involvement (see
        // docs/loan-backing-deployment.md for why this scope was kept
        // deliberately narrow to savings-backed loans only).
        txHash = await disburseXlmPayment({
          lenderAddress: walletAddr,
          borrowerAddress: loan.wallet,
          xlmAmount: loan.amount,
          loanId: loan.id,
        })
      }

      setDisburseTxHash(txHash)

      // Record disbursement in Bankero
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
  async function markDefaulted(loan: LocalLoan) {
    if (loan.backingType === 'savings' && loan.onchainLoanId != null) {
      try {
        let walletAddr = lenderWalletAddr
        if (!walletAddr) {
          walletAddr = await connectWallet()
          setLenderWalletAddr(walletAddr)
        }
        await invokeContractWrite(CONTRACT_IDS.loanRegistry, 'mark_defaulted', addressLoanIdArgs(walletAddr, loan.onchainLoanId), walletAddr)
      } catch (err) {
        setDisburseError(err instanceof ContractWriteError || err instanceof Error ? err.message : 'Could not mark this loan defaulted on-chain.')
        return
      }
    }
    await updateLoanStatus(loan.id, 'Defaulted')
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

  // ── Approve & disburse confirmation ─────────────────────
  const [confirmingLoan, setConfirmingLoan] = useState<LocalLoan | null>(null)

  function openApproveConfirm(loan: LocalLoan) {
    setConfirmingLoan(loan)
    viewProfile(loan.wallet) // populates `profile` with the borrower's real status for the modal
  }

  async function handleConfirmDisburse() {
    if (!confirmingLoan) return
    const loan = confirmingLoan
    setConfirmingLoan(null)
    try {
      await approve(loan) // bookkeeping — if the disbursement below fails, the loan lands in the existing "Approved — Disburse Now" list, retryable from there
    } catch (err: any) {
      const msg = err?.message ?? 'Could not approve this loan.'
      if (msg === 'FREIGHTER_NOT_INSTALLED') {
        setDisburseError('Freighter wallet not found. Please install the Freighter browser extension to approve a savings-backed loan.')
      } else if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied')) {
        setDisburseError('Wallet connection was cancelled, so the loan was not approved.')
      } else {
        setDisburseError(msg)
      }
      return
    }
    await disburse(loan)
  }

  // Mirrors useScore.ts's merge logic (on-chain contract + local cache +
  // anchor bonuses) — the borrower's own score view was already correct,
  // this modal was the one place still only reading repayment_score from
  // score_cache and hardcoding tx/vouch/anchor to 0, which is why a
  // borrower's real 686 was showing here as a bare 300.
  async function viewProfile(wallet: string) {
    setProfileLoading(wallet)
    const borrowerLoans = loans.filter(l => l.wallet === wallet)
    try {
      const onChain = await fetchOnChainScore(wallet)
      const local = getScoreCache(wallet)
      const totalLoans     = Math.max(onChain?.total_loans ?? 0, local.total_loans, borrowerLoans.length)
      const loansRepaid    = Math.max(onChain?.loans_repaid ?? 0, local.loans_repaid, borrowerLoans.filter(l => l.status === 'Repaid').length)
      const loansDefaulted = Math.max(onChain?.loans_defaulted ?? 0, local.loans_defaulted, borrowerLoans.filter(l => l.status === 'Defaulted').length)
      // Derived from the merged counts (not Math.max of two precomputed
      // scores) — see useScore.ts for why that got stuck at a stale ceiling.
      const repayment = computeRepaymentScore(totalLoans, loansRepaid, loansDefaulted)
      const tx = onChain?.tx_score ?? 0
      const vouch = onChain?.vouch_score ?? 0
      const anchor = Math.max(onChain?.anchor_score ?? 0, computeAnchorScore(wallet))
      setProfile({
        wallet,
        name: borrowerNames[wallet] ?? null,
        score: computeLocalScore(repayment, tx, vouch, anchor),
        repayment, tx, vouch, anchor,
        totalLoans, loansRepaid, loansDefaulted,
        loans: borrowerLoans,
      })
    } catch {
      // On-chain fetch failed — fall back to whatever's in the local cache
      const local = getScoreCache(wallet)
      const anchor = computeAnchorScore(wallet)
      const totalLoans     = Math.max(local.total_loans, borrowerLoans.length)
      const loansRepaid    = Math.max(local.loans_repaid, borrowerLoans.filter(l => l.status === 'Repaid').length)
      const loansDefaulted = Math.max(local.loans_defaulted, borrowerLoans.filter(l => l.status === 'Defaulted').length)
      const repayment = computeRepaymentScore(totalLoans, loansRepaid, loansDefaulted)
      setProfile({
        wallet,
        name: borrowerNames[wallet] ?? null,
        score: computeLocalScore(repayment, 0, 0, anchor),
        repayment, tx: 0, vouch: 0, anchor,
        totalLoans, loansRepaid, loansDefaulted,
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

  // "Loans" nav badge: a new request is awaiting your decision, or a
  // borrower you lent to has repaid and you haven't seen it yet.
  const unseenRepaid = repaid.filter(l => l.lenderWallet === lender?.wallet_address && !seenRepaidIds.has(l.id))
  const loansNeedAttention = pending.length > 0 || unseenRepaid.length > 0
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
          <img src="/bankero-logo.png" alt="Bankero" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'contain' }} />
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
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={16} strokeWidth={2} />
              {id === 'Loans' && loansNeedAttention && (
                <span style={{ position: 'absolute', top: -2, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#EF4444', border: '2px solid var(--panel)' }} />
              )}
            </span>
            {id}
          </button>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => setPage('Settings')} className={`sidenav-btn${page === 'Settings' ? ' active' : ''}`}>
            <UserCircle size={16} strokeWidth={2} /> My Profile
          </button>
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
                { label: 'Total Disbursed', value: formatXlmAmount(totalDisbursed), color: '#3B82F6',      Icon: Banknote },
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
                <div key={loan.id}
                  onClick={() => viewProfile(loan.wallet)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 12px', marginLeft: -12, marginRight: -12, borderRadius: 12, borderBottom: i < pending.length - 1 ? '1px solid var(--border-2)' : 'none', cursor: 'pointer', transition: 'background 120ms ease' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--green-tint)', border: '1px solid var(--green-border)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {profileLoading === loan.wallet
                      ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--green-border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
                      : <Users size={16} strokeWidth={2} color="var(--green)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{borrowerNames[loan.wallet] ?? formatWallet(loan.wallet)}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                      {borrowerNames[loan.wallet] && <span style={{ fontFamily: 'var(--font-mono)' }}>{formatWallet(loan.wallet)} · </span>}
                      {loan.purpose} · {loan.term} days · Applied {new Date(loan.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <BackingBadge backingType={loan.backingType} backingAmount={loan.backingAmount} vouchTotal={vouchTotals[loan.wallet]} />
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{formatXlmAmount(loan.amount)}</p>
                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openApproveConfirm(loan)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
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
                  <div key={loan.id}
                    onClick={() => viewProfile(loan.wallet)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 12px', marginLeft: -12, marginRight: -12, borderRadius: 12, borderBottom: i < approved.length - 1 ? '1px solid var(--border-2)' : 'none', cursor: 'pointer', transition: 'background 120ms ease' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {profileLoading === loan.wallet
                        ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #BFDBFE', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite' }} />
                        : <Users size={16} strokeWidth={2} color="#3B82F6" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{borrowerNames[loan.wallet] ?? formatWallet(loan.wallet)}</p>
                      <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                        {borrowerNames[loan.wallet] && <span style={{ fontFamily: 'var(--font-mono)' }}>{formatWallet(loan.wallet)} · </span>}
                        {loan.purpose} · {loan.term} days
                      </p>
                    </div>
                    <BackingBadge backingType={loan.backingType} backingAmount={loan.backingAmount} vouchTotal={vouchTotals[loan.wallet]} />
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{formatXlmAmount(loan.amount)}</p>
                    <div onClick={e => e.stopPropagation()}>
                      {loan.backingType === 'savings' && loan.onchainLoanId == null ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', padding: '8px 12px', display: 'inline-block' }}>
                          Waiting for borrower to lock collateral
                        </span>
                      ) : (
                        <button onClick={() => disburse(loan)} disabled={disbursingId === loan.id} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)', opacity: disbursingId === loan.id ? 0.65 : 1 }}>
                          {disbursingId === loan.id
                            ? <><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                            : <><Banknote size={13} strokeWidth={2} /> Disburse {formatXlmAmount(loan.amount)}</>}
                        </button>
                      )}
                    </div>
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
                <div key={loan.id}
                  onClick={() => viewProfile(loan.wallet)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px', marginLeft: -12, marginRight: -12, borderRadius: 12, borderBottom: i < loans.length - 1 ? '1px solid var(--border-2)' : 'none', cursor: 'pointer', transition: 'background 120ms ease' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {profileLoading === loan.wallet
                      ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
                      : <Users size={16} strokeWidth={2} color="var(--ink-4)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{borrowerNames[loan.wallet] ?? formatWallet(loan.wallet)}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                      {borrowerNames[loan.wallet] && <span style={{ fontFamily: 'var(--font-mono)' }}>{formatWallet(loan.wallet)} · </span>}
                      {loan.purpose} · {loan.term} days · {new Date(loan.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{formatXlmAmount(loan.amount)}</p>
                  {['Pending', 'Approved', 'Disbursed', 'Repaid'].includes(loan.status) && (
                    <div
                      title={loan.status === 'Repaid' ? 'Interest earned' : 'Interest you\'ll gain once this loan is disbursed and repaid'}
                      style={{
                        textAlign: 'right', flexShrink: 0, padding: '3px 9px', borderRadius: 10,
                        background: loan.status === 'Repaid' ? 'var(--green-tint)' : 'var(--surface-2)',
                        border: `1px solid ${loan.status === 'Repaid' ? '#BBF7D0' : 'var(--border-2)'}`,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: loan.status === 'Repaid' ? '#16A34A' : 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                        +{formatXlmAmount(loan.interest)}
                      </div>
                      <div style={{ fontSize: 10, color: loan.status === 'Repaid' ? '#16A34A' : 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                        {xlmToPesoEstimate(loan.interest)}
                      </div>
                    </div>
                  )}
                  <BackingBadge backingType={loan.backingType} backingAmount={loan.backingAmount} vouchTotal={vouchTotals[loan.wallet]} />
                  <StatusPill status={loan.status} />
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    {loan.status === 'Pending' && (<>
                      <button onClick={() => openApproveConfirm(loan)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
                        <Check size={12} strokeWidth={2.5} /> Approve
                      </button>
                      <button onClick={() => reject(loan.id)} className="btn btn-sm" style={{ borderRadius: 'var(--r-md)', background: '#FEF2F2', color: '#DC2626', border: 'none' }}>
                        <X size={12} strokeWidth={2.5} /> Reject
                      </button>
                    </>)}
                    {loan.status === 'Approved' && (
                      loan.backingType === 'savings' && loan.onchainLoanId == null ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>Waiting for borrower</span>
                      ) : (
                        <button onClick={() => disburse(loan)} disabled={disbursingId === loan.id} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)', opacity: disbursingId === loan.id ? 0.65 : 1 }}>
                          {disbursingId === loan.id
                            ? <><div style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                            : <><Banknote size={12} strokeWidth={2} /> Disburse {formatXlmAmount(loan.amount)}</>}
                        </button>
                      )
                    )}
                    {isOverdue(loan) && (
                      <button onClick={() => markDefaulted(loan)} className="btn btn-sm" style={{ borderRadius: 'var(--r-md)', background: '#FEF2F2', color: '#DC2626', border: 'none', fontSize: 11 }}>
                        <AlertCircle size={11} strokeWidth={2.5} /> Mark Defaulted
                      </button>
                    )}
                  </div>
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
                { label: 'Portfolio Value',  value: formatXlmAmount(totalDisbursed), Icon: Banknote,    color: 'var(--green)' },
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
            <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 6 }}>My Profile</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 28 }}>Your profile and lending preferences — saved to your Bankero account.</p>
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
                <h3 className="heading" style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 18 }}>Max Loan Amount (XLM)</h3>
                <input className="input" type="number" value={maxLoan} onChange={e => setMaxLoan(Number(e.target.value))} min={10} max={2000} />
                <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>Maximum XLM you're willing to lend per borrower</p>
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
          { icon: Home,       label: 'Dashboard',  pageId: 'Dashboard' },
          { icon: CreditCard, label: 'Loans',      pageId: 'Loans' },
          { icon: BarChart2,  label: 'Reports',    pageId: 'Reports' },
          { icon: UserCircle, label: 'My Profile', pageId: 'Settings' },
        ].map(n => {
          const Icon = n.icon
          const active = page === n.pageId
          return (
            <button key={n.pageId} onClick={() => setPage(n.pageId)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: active ? 'var(--green)' : 'rgba(255,255,255,.4)', fontSize: 9, fontWeight: 700 }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                {n.pageId === 'Loans' && loansNeedAttention && (
                  <span style={{ position: 'absolute', top: -1, right: -2, width: 9, height: 9, borderRadius: '50%', background: '#EF4444', border: '2px solid var(--panel)' }} />
                )}
              </span>
              {n.label}
            </button>
          )
        })}
      </nav>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Borrower Profile Modal ──────────────────────── */}
      {profile && !confirmingLoan && <BorrowerProfileModal profile={profile} onClose={() => setProfile(null)} />}

      {/* ── Approve & Disburse Confirmation ───────────────── */}
      {confirmingLoan && (
        <ApproveConfirmModal
          loan={confirmingLoan}
          profile={profile && profile.wallet === confirmingLoan.wallet ? profile : null}
          profileLoading={profileLoading === confirmingLoan.wallet}
          onCancel={() => { setConfirmingLoan(null); setProfile(null) }}
          onConfirm={handleConfirmDisburse}
          disbursing={disbursingId === confirmingLoan.id}
        />
      )}
    </div>
  )
}

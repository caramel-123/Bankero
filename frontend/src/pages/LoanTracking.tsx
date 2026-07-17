import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, ArrowRight, Clock, CheckCircle, Zap,
  AlertTriangle, XCircle, RefreshCw, CreditCard, TrendingUp, X, Trash2, ChevronDown, Info, PiggyBank,
} from 'lucide-react'
import { formatXlmAmount, scoreTier, scorePercent, xlmToStroops, CONTRACT_IDS } from '../lib/stellar'
import {
  fetchLoans, updateLoanStatus, updateScoreOnRepay, updateScoreOnDefault, deleteLoan, setOnchainLoanId,
  computeLocalScore, computeRepaymentScore, daysUntil, formatDate,
  type LocalLoan, type LoanStatus
} from '../lib/loanStore'
import { invokeContractWrite, applyLoanArgs, addressLoanIdArgs, ContractWriteError } from '../lib/contracts'
import { DEMO_LOANS, DEMO_SCORE_RECORD } from '../lib/demoData'
import { useScore } from '../hooks/useScore'
import { markLoansSeen } from '../hooks/useLoanAlerts'
import GuestActionModal from '../components/GuestActionModal'
import BottomNav from '../components/BottomNav'
import ScoreInfoModal, { SCORE_FACTORS } from '../components/ScoreInfoModal'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const STATUS_CFG: Record<LoanStatus, { label: string; color: string; bg: string; Icon: any }> = {
  Pending:   { label: 'Pending Approval', color: '#D97706',      bg: '#FFFBEB',          Icon: Clock },
  Approved:  { label: 'Approved',         color: '#3B82F6',      bg: '#EFF6FF',          Icon: CheckCircle },
  Disbursed: { label: 'Active',           color: 'var(--green)', bg: 'var(--green-tint)', Icon: Zap },
  Repaid:    { label: 'Repaid',           color: 'var(--ink-3)', bg: 'var(--surface-2)', Icon: CheckCircle },
  Defaulted: { label: 'Defaulted',        color: '#DC2626',      bg: '#FEF2F2',          Icon: XCircle },
  Rejected:  { label: 'Rejected',         color: '#6B7280',      bg: 'var(--surface-3)', Icon: XCircle },
}

// ── Repay Modal ────────────────────────────────────────────
function RepayModal({
  loan, txScore, vouchScore, anchorScore, repaymentScore, totalLoans, loansRepaid, loansDefaulted,
  onConfirm, onClose, repaying, error,
}: {
  loan: LocalLoan; txScore: number; vouchScore: number; anchorScore: number
  repaymentScore: number; totalLoans: number; loansRepaid: number; loansDefaulted: number
  onConfirm: () => void; onClose: () => void; repaying: boolean; error: string | null
}) {
  const scoreBefore = computeLocalScore(repaymentScore, txScore, vouchScore, anchorScore)
  const newRepayment = computeRepaymentScore(totalLoans + 1, loansRepaid + 1, loansDefaulted)
  const scoreAfter = computeLocalScore(newRepayment, txScore, vouchScore, anchorScore)
  const scoreDiff = scoreAfter - scoreBefore
  const tierAfter = scoreTier(scoreAfter)
  const [showExplainer, setShowExplainer] = useState(false)
  const rawBefore = repaymentScore * 40 + txScore * 25 + vouchScore * 20 + anchorScore * 15
  const rawAfter = newRepayment * 40 + txScore * 25 + vouchScore * 20 + anchorScore * 15

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,31,58,.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: 480, background: 'var(--surface)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px rgba(11,31,58,.24)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F1F5F9', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
          <X size={15} strokeWidth={2} />
        </button>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--green-tint)', border: '1.5px solid #BBF7D0', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <CreditCard size={24} strokeWidth={1.75} color="#16A34A" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>Repay Loan</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>Confirm repayment. Your credit score will increase immediately.</p>

        <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16, marginBottom: 20, border: '1px solid var(--border-2)' }}>
          {[['Principal', formatXlmAmount(loan.amount)], ['Interest (5%)', formatXlmAmount(loan.interest)]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: 'var(--ink-3)' }}>{l}</span>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
            <span>Total to Pay</span><span style={{ color: 'var(--green)' }}>{formatXlmAmount(loan.total)}</span>
          </div>
        </div>

        <div style={{ background: 'var(--green-tint)', borderRadius: 14, padding: 16, border: '1px solid #BBF7D0', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#15803D', display: 'flex', alignItems: 'center', gap: 7 }}>
              <TrendingUp size={14} strokeWidth={2} /> Score impact after repayment
            </div>
            <button
              onClick={() => setShowExplainer(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#15803D', fontSize: 11.5, fontWeight: 700, padding: 0 }}
            >
              <Info size={13} strokeWidth={2} /> Why these numbers?
            </button>
          </div>

          {showExplainer && (
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 11.5, lineHeight: 1.7, color: 'var(--ink-2, #334155)', fontFamily: 'monospace', overflowX: 'auto', border: '1px solid #BBF7D0' }}>
              <div style={{ color: '#15803D', fontWeight: 700, marginBottom: 4 }}>1. Repayment History moves ({loansRepaid}/{totalLoans} repaid → {loansRepaid + 1}/{totalLoans + 1}):</div>
              round( {loansRepaid} ÷ ({totalLoans}+2) × 100 ) = {repaymentScore}/100<br />
              round( {loansRepaid + 1} ÷ ({totalLoans + 1}+2) × 100 ) = {newRepayment}/100
              <div style={{ color: '#15803D', fontWeight: 700, margin: '10px 0 4px' }}>2. That factor feeds into your weighted raw score (repayment × 40, tx × 25, community × 20, remittance × 15):</div>
              before: ({repaymentScore}×40)+({txScore}×25)+({vouchScore}×20)+({anchorScore}×15) = {rawBefore}<br />
              after:&nbsp;&nbsp;({newRepayment}×40)+({txScore}×25)+({vouchScore}×20)+({anchorScore}×15) = {rawAfter}
              <div style={{ color: '#15803D', fontWeight: 700, margin: '10px 0 4px' }}>3. Rescaled onto the 300–850 range:</div>
              before: 300 + round( {rawBefore} × 550 ÷ 10,000 ) = {scoreBefore}<br />
              after:&nbsp;&nbsp;300 + round( {rawAfter} × 550 ÷ 10,000 ) = {scoreAfter}
              <div style={{ color: '#B45309', fontWeight: 700, marginTop: 10 }}>
                {scoreDiff === 0
                  ? `Same rounded repayment factor (${repaymentScore}→${newRepayment}) means no visible change this time — it still counted, just not enough yet to tip the rounding.`
                  : `${scoreAfter} − ${scoreBefore} = +${scoreDiff} pts, entirely from the Repayment History move above.`}
              </div>
            </div>
          )}

          {/* Repayment is the only one of the 4 factors this action changes —
              showing it directly explains why the overall score (40% weight)
              moves by less than the factor itself does. */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '10px 12px', background: 'rgba(255,255,255,.6)', borderRadius: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#166534' }}>Repayment History (40% weight)</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
              {repaymentScore}/100 <ArrowRight size={12} strokeWidth={2.5} /> {newRepayment}/100
            </span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, marginBottom: 8 }}>OVERALL CREDIT SCORE</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, marginBottom: 4 }}>BEFORE</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink-4)' }}>{scoreBefore}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <ArrowRight size={20} strokeWidth={2} color="#16A34A" />
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>+{scoreDiff} pts</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, marginBottom: 4 }}>AFTER</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: tierAfter.color }}>{scoreAfter}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: tierAfter.color }}>{tierAfter.label}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, position: 'relative', height: 8, borderRadius: 999, background: '#E2E8F0', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', height: '100%', borderRadius: 999, background: '#CBD5E1', width: `${scorePercent(scoreBefore)}%` }} />
            <div style={{ position: 'absolute', height: '100%', borderRadius: 999, background: `linear-gradient(90deg,${tierAfter.color},#4ADE80)`, width: `${scorePercent(scoreAfter)}%`, transition: 'width .6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 10, color: 'var(--ink-4)', fontWeight: 700 }}><span>300</span><span>850</span></div>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 14, fontSize: 12.5, color: '#991B1B' }}>
            <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}
        <button onClick={onConfirm} disabled={repaying} style={{ width: '100%', padding: '15px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', background: 'var(--green)', border: 'none', cursor: repaying ? 'default' : 'pointer', opacity: repaying ? 0.65 : 1, boxShadow: '0 4px 16px rgba(22,163,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          {repaying
            ? <><div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Repaying…</>
            : <><CheckCircle size={17} strokeWidth={2} /> Confirm Repayment — {formatXlmAmount(loan.total)}</>}
        </button>
        <button onClick={onClose} disabled={repaying} style={{ width: '100%', marginTop: 10, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Repay success toast ────────────────────────────────────
function RepaySuccessBanner({ newScore, scoreDiff, onDismiss }: { newScore: number; scoreDiff: number; onDismiss: () => void }) {
  const tier = scoreTier(newScore)
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, width: 340, background: 'var(--ink)', borderRadius: 18, padding: '20px 22px', boxShadow: '0 12px 40px rgba(11,31,58,.3)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(22,163,74,.2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <TrendingUp size={20} strokeWidth={2} color="#4ADE80" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Loan Repaid!</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>Score increased by <strong style={{ color: '#4ADE80' }}>+{scoreDiff} pts</strong></div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{newScore}</span>
          <span style={{ padding: '3px 10px', borderRadius: 999, background: tier.color, color: '#fff', fontSize: 12, fontWeight: 700 }}>{tier.label}</span>
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: 4 }}>
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  )
}

// ── Cancel loan modal ───────────────────────────────────────
function CancelLoanModal({ loan, onConfirm, onClose }: { loan: LocalLoan; onConfirm: () => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,31,58,.5)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: 420, background: 'var(--surface)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px rgba(11,31,58,.24)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F1F5F9', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
          <X size={15} strokeWidth={2} />
        </button>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: '#FEF2F2', border: '1.5px solid #FECACA', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <Trash2 size={22} strokeWidth={1.75} color="#DC2626" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>Remove this loan?</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6 }}>
          This cancels your application for <strong style={{ color: 'var(--ink)' }}>{formatXlmAmount(loan.amount)}</strong>. Since it hasn't been disbursed yet, this won't affect your credit score.
        </p>
        <button onClick={onConfirm} style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', background: '#DC2626', border: 'none', cursor: 'pointer', marginBottom: 10 }}>
          Yes, remove it
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer' }}>
          Keep it
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
const TABS: LoanStatus[] = ['Pending', 'Approved', 'Disbursed', 'Repaid', 'Defaulted', 'Rejected']
const TAB_LABELS: Record<LoanStatus, string> = {
  Pending: 'Pending', Approved: 'Approved', Disbursed: 'Active',
  Repaid: 'Repaid', Defaulted: 'Defaulted', Rejected: 'Rejected',
}

export default function LoanTracking({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [loans, setLoans] = useState<LocalLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<LoanStatus>('Pending')
  const [repayingLoan, setRepayingLoan] = useState<LocalLoan | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ newScore: number; diff: number } | null>(null)
  const [defaultedInfo, setDefaultedInfo] = useState<{ count: number } | null>(null)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [cancelingLoan, setCancelingLoan] = useState<LocalLoan | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [repaying, setRepaying] = useState(false)
  const [repayError, setRepayError] = useState<string | null>(null)
  const [lockingCollateralId, setLockingCollateralId] = useState<string | null>(null)
  const [lockError, setLockError] = useState<string | null>(null)

  const { record: liveRecord, isLoading: scoreLoading, refresh: refreshScore } = useScore(wallet.isGuest ? null : wallet.publicKey)
  const [openingRepayId, setOpeningRepayId] = useState<string | null>(null)

  // The Repay modal needs a guaranteed-fresh score, not whatever was loaded
  // whenever this page first mounted — that staleness was why its BEFORE/AFTER
  // preview kept disagreeing with what Home actually showed post-repayment.
  async function openRepayModal(loan: LocalLoan) {
    setOpeningRepayId(loan.id)
    await refreshScore()
    setOpeningRepayId(null)
    setRepayingLoan(loan)
  }
  const scoreRecord = wallet.isGuest ? DEMO_SCORE_RECORD : liveRecord

  async function refresh() {
    if (wallet.isGuest) {
      setLoans(DEMO_LOANS as unknown as LocalLoan[])
      setLoading(false)
      return
    }
    if (!wallet.publicKey) return
    setLoading(true)
    const all = await fetchLoans(wallet.publicKey)
    let defaultCount = 0
    for (const l of all) {
      if (l.status === 'Disbursed' && l.dueAt && new Date(l.dueAt) < new Date()) {
        try { await updateLoanStatus(l.id, 'Defaulted') } catch (err) { console.error(err) }
        try { await updateScoreOnDefault(l.wallet) } catch (err) { console.error(err) }
        l.status = 'Defaulted'
        defaultCount++
      }
    }
    if (defaultCount > 0) setDefaultedInfo({ count: defaultCount })
    setLoans(all)
    markLoansSeen(wallet.publicKey, all)
    setLoading(false)
  }

  useEffect(() => { refresh() }, [wallet.publicKey, wallet.isGuest])

  // Auto-switch to first tab that has loans
  useEffect(() => {
    if (loans.length > 0 && !loans.find(l => l.status === activeTab)) {
      const first = TABS.find(t => loans.some(l => l.status === t))
      if (first) setActiveTab(first)
    }
  }, [loans])

  async function handleRepayConfirm() {
    if (!repayingLoan) return
    const w = wallet.publicKey ?? repayingLoan.wallet
    setRepayError(null)

    // Savings-backed loans moved their principal through the real on-chain
    // loan_registry when disbursed (see disburse_loan on the lender side),
    // so repayment must also be a real on-chain transaction here — this is
    // the moment collateral gets released. Vouch/none-backed loans keep
    // today's Supabase-only status flip, unchanged.
    if (repayingLoan.backingType === 'savings' && repayingLoan.onchainLoanId != null && wallet.publicKey) {
      setRepaying(true)
      try {
        await invokeContractWrite(
          CONTRACT_IDS.loanRegistry, 'repay_loan',
          addressLoanIdArgs(wallet.publicKey, repayingLoan.onchainLoanId),
          wallet.publicKey
        )
      } catch (err) {
        setRepayError(err instanceof ContractWriteError || err instanceof Error ? err.message : 'Repayment failed on-chain — please try again.')
        setRepaying(false)
        return
      }
      setRepaying(false)
    }

    const txScore = scoreRecord?.tx_score ?? 0
    const vouchScore = scoreRecord?.vouch_score ?? 0
    const anchorScore = scoreRecord?.anchor_score ?? 0
    const totalLoansBefore = scoreRecord?.total_loans ?? 0
    const loansRepaidBefore = scoreRecord?.loans_repaid ?? 0
    const loansDefaulted = scoreRecord?.loans_defaulted ?? 0
    const scoreBefore = computeLocalScore(scoreRecord?.repayment_score ?? 0, txScore, vouchScore, anchorScore)
    await updateLoanStatus(repayingLoan.id, 'Repaid')
    // Still needed for its side effect (persists the increment to the local
    // cache + Supabase score_cache table) — but its *return value* isn't
    // used for the number below, since it increments from that same local
    // cache, which can be far behind the real merged total (scoreRecord),
    // and Math.max-ing against a smaller "+1" would silently no-op, exactly
    // the bug that made this notification disagree with the modal's own
    // preview. Increment the merged snapshot directly instead, the same way
    // the modal's preview already does, so both always agree.
    await updateScoreOnRepay(w)
    const repaymentAfter = computeRepaymentScore(totalLoansBefore + 1, loansRepaidBefore + 1, loansDefaulted)
    const scoreAfter = computeLocalScore(repaymentAfter, txScore, vouchScore, anchorScore)
    setRepayingLoan(null)
    setRepayError(null)
    setActiveTab('Repaid')
    await refresh()
    setSuccessInfo({ newScore: scoreAfter, diff: scoreAfter - scoreBefore })
  }

  async function handleLockCollateral(loan: LocalLoan) {
    if (!wallet.publicKey || !loan.lenderWallet) return
    setLockingCollateralId(loan.id)
    setLockError(null)
    try {
      const args = applyLoanArgs(
        wallet.publicKey, loan.lenderWallet,
        xlmToStroops(loan.amount), loan.term,
        'savings', xlmToStroops(loan.backingAmount)
      )
      const { returnValue } = await invokeContractWrite(CONTRACT_IDS.loanRegistry, 'apply_loan', args, wallet.publicKey)
      await setOnchainLoanId(loan.id, Number(returnValue))
      await refresh()
    } catch (err) {
      setLockError(err instanceof ContractWriteError || err instanceof Error ? err.message : 'Could not lock collateral — please try again.')
    } finally {
      setLockingCollateralId(null)
    }
  }

  async function handleCancelConfirm() {
    if (!cancelingLoan) return
    if (wallet.isGuest) { setShowGuestModal(true); setCancelingLoan(null); return }
    await deleteLoan(cancelingLoan.id)
    setCancelingLoan(null)
    await refresh()
  }

  const tabLoans = loans.filter(l => l.status === activeTab)
  const counts: Partial<Record<LoanStatus, number>> = {}
  for (const l of loans) counts[l.status] = (counts[l.status] ?? 0) + 1
  const visibleTabs = TABS.filter(t => (counts[t] ?? 0) > 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: '32px 32px 100px' }}>

      {showGuestModal && <GuestActionModal onClose={() => setShowGuestModal(false)} />}
      {showInfoModal && <ScoreInfoModal onClose={() => setShowInfoModal(false)} />}
      {cancelingLoan && (
        <CancelLoanModal loan={cancelingLoan} onConfirm={handleCancelConfirm} onClose={() => setCancelingLoan(null)} />
      )}
      {repayingLoan && wallet.publicKey && (
        <RepayModal
          loan={repayingLoan}
          txScore={scoreRecord?.tx_score ?? 0}
          vouchScore={scoreRecord?.vouch_score ?? 0}
          anchorScore={scoreRecord?.anchor_score ?? 0}
          repaymentScore={scoreRecord?.repayment_score ?? 0}
          totalLoans={scoreRecord?.total_loans ?? 0}
          loansRepaid={scoreRecord?.loans_repaid ?? 0}
          loansDefaulted={scoreRecord?.loans_defaulted ?? 0}
          onConfirm={handleRepayConfirm}
          onClose={() => { setRepayingLoan(null); setRepayError(null) }}
          repaying={repaying} error={repayError}
        />
      )}
      {successInfo && (
        <RepaySuccessBanner newScore={successInfo.newScore} scoreDiff={successInfo.diff} onDismiss={() => setSuccessInfo(null)} />
      )}
      {defaultedInfo && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, width: 360, background: '#DC2626', borderRadius: 18, padding: '20px 22px', boxShadow: '0 12px 40px rgba(220,38,38,.35)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} strokeWidth={2} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Loan Overdue — Defaulted</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', lineHeight: 1.5 }}>
              {defaultedInfo.count} loan{defaultedInfo.count > 1 ? 's have' : ' has'} passed the due date. Credit score decreased by {defaultedInfo.count * 15} pts.
            </div>
          </div>
          <button onClick={() => setDefaultedInfo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', padding: 4 }}>
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      )}

      <button onClick={() => nav('/home')} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} strokeWidth={2} /> Back
      </button>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>My Loans</h1>
            <p style={{ color: 'var(--ink-3)' }}>{loading ? 'Loading…' : `${loans.length} loan${loans.length !== 1 ? 's' : ''} total`}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowInfoModal(true)} className="btn btn-ghost btn-sm" title="How your score is calculated">
              <Info size={14} strokeWidth={2} />
            </button>
            <button onClick={refresh} className="btn btn-ghost btn-sm" disabled={loading}>
              <RefreshCw size={14} strokeWidth={2} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
            </button>
          </div>
        </div>

        {/* How your score is calculated */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
          <button
            onClick={() => setShowBreakdown(s => !s)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: 'none', background: 'none', cursor: 'pointer', padding: 0,
              marginBottom: showBreakdown ? 22 : 0,
            }}
          >
            <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)' }}>How your score is calculated</h3>
            <ChevronDown size={18} strokeWidth={2} color="var(--ink-4)" style={{ transform: showBreakdown ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
          </button>

          {showBreakdown && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {SCORE_FACTORS.map(f => {
                const value = (scoreRecord?.[f.key] ?? 0) as number
                return (
                  <div key={f.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{f.label}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-4)', background: 'var(--surface-3)', padding: '1px 7px', borderRadius: 'var(--r-full)' }}>{f.weight}%</span>
                      </div>
                      <span className="score-num" style={{ fontSize: 15, color: 'var(--ink-2)' }}>
                        {scoreLoading ? '—' : value}
                        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/100</span>
                      </span>
                    </div>
                    <div className="progress-track">
                      {scoreLoading
                        ? <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-full)' }} />
                        : <div className="progress-fill" style={{ width: `${value}%`, background: f.color }} />
                      }
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, marginTop: 6 }}>{f.desc}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary strip */}
        {loans.length > 0 && (
          <div className="loan-summary-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Applied', value: formatXlmAmount(loans.reduce((s, l) => s + l.amount, 0)), color: 'var(--ink)' },
              { label: 'Active Loans',  value: String(counts['Disbursed'] ?? 0), color: 'var(--green)' },
              { label: 'Pending',       value: String(counts['Pending'] ?? 0),   color: '#F59E0B' },
              { label: 'Loans Repaid',  value: String(counts['Repaid'] ?? 0),    color: 'var(--ink-3)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border-2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {visibleTabs.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #E2E8F0' }}>
            {visibleTabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding: '10px 18px', fontSize: 14, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === t ? 'var(--ink)' : '#94A3B8', borderBottom: activeTab === t ? '2px solid var(--ink)' : '2px solid transparent', marginBottom: -2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {TAB_LABELS[t]}
                <span style={{ padding: '1px 7px', borderRadius: 999, background: activeTab === t ? 'var(--ink)' : '#E2E8F0', color: activeTab === t ? '#fff' : '#6B7280', fontSize: 11, fontWeight: 800 }}>{counts[t]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && loans.length === 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 56, border: '1px solid var(--border-2)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface-2)', border: '1.5px solid var(--border)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <FileText size={28} strokeWidth={1.5} color="#94A3B8" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>No loans yet</h3>
            <p style={{ color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6, maxWidth: 300, margin: '0 auto 24px' }}>Apply for your first micro-loan. Repaying on time builds your credit score.</p>
            <button onClick={() => nav('/apply')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--green)', border: 'none', cursor: 'pointer' }}>
              Apply for a Loan <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {!loading && loans.length > 0 && tabLoans.length === 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 40, border: '1px solid var(--border-2)', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No {TAB_LABELS[activeTab].toLowerCase()} loans</p>
          </div>
        )}

        {!loading && tabLoans.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tabLoans.map(loan => {
              const cfg = STATUS_CFG[loan.status]
              const StatusIcon = cfg.Icon
              const isActive   = loan.status === 'Disbursed'
              const isPending  = loan.status === 'Pending'
              const isApproved = loan.status === 'Approved'

              return (
                <div key={loan.id} style={{ background: 'var(--surface)', borderRadius: 18, border: `1.5px solid ${isActive ? '#BBF7D0' : '#E2E8F0'}`, overflow: 'hidden', boxShadow: isActive ? '0 4px 20px rgba(22,163,74,.1)' : '0 1px 3px rgba(15,23,42,.04)' }}>

                  {isActive && (
                    <div style={{ background: 'var(--green-tint)', borderBottom: '1px solid #BBF7D0', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#15803D' }}>
                        <Zap size={14} strokeWidth={2} /> Active — repayment due {loan.dueAt ? formatDate(loan.dueAt) : '—'}
                      </div>
                      {loan.dueAt && daysUntil(loan.dueAt) <= 3 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '3px 10px', borderRadius: 999 }}>
                          <AlertTriangle size={12} strokeWidth={2} /> {daysUntil(loan.dueAt)} days left
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, border: `1.5px solid ${cfg.color}28`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <StatusIcon size={20} strokeWidth={1.75} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{formatXlmAmount(loan.amount)}</span>
                          <span style={{ padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--ink-3)' }}>
                          <span><strong style={{ color: 'var(--ink)' }}>Purpose:</strong> {loan.purpose}</span>
                          <span><strong style={{ color: 'var(--ink)' }}>Term:</strong> {loan.term} days</span>
                          <span><strong style={{ color: 'var(--ink)' }}>Applied:</strong> {formatDate(loan.appliedAt)}</span>
                          {loan.dueAt && <span><strong style={{ color: 'var(--ink)' }}>Due:</strong> {formatDate(loan.dueAt)}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 2 }}>Total repayment</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{formatXlmAmount(loan.total)}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>+{formatXlmAmount(loan.interest)} interest</div>
                      </div>
                    </div>

                    {isActive && loan.dueAt && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>
                          <span>Time elapsed</span>
                          <span style={{ fontWeight: 700, color: daysUntil(loan.dueAt) <= 3 ? '#DC2626' : '#16A34A' }}>{daysUntil(loan.dueAt)} days remaining</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
                          {(() => {
                            const elapsed = loan.term - daysUntil(loan.dueAt!)
                            const pct = Math.min(100, Math.round((elapsed / loan.term) * 100))
                            return <div style={{ width: `${pct}%`, height: '100%', background: daysUntil(loan.dueAt!) <= 3 ? '#DC2626' : '#16A34A', borderRadius: 999 }} />
                          })()}
                        </div>
                      </div>
                    )}

                    {loan.notes && (
                      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid #F1F5F9', fontSize: 13, color: 'var(--ink-3)' }}>
                        <strong style={{ color: 'var(--ink)' }}>Note:</strong> {loan.notes}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

                      {isActive && (
                        <button
                          onClick={() => wallet.isGuest ? setShowGuestModal(true) : openRepayModal(loan)}
                          disabled={openingRepayId === loan.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--green)', border: 'none', cursor: openingRepayId === loan.id ? 'default' : 'pointer', opacity: openingRepayId === loan.id ? 0.7 : 1, boxShadow: '0 3px 12px rgba(22,163,74,.28)' }}>
                          {openingRepayId === loan.id
                            ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Loading…</>
                            : <><CheckCircle size={16} strokeWidth={2} /> Repay Loan — {formatXlmAmount(loan.total)}</>}
                        </button>
                      )}

                      {isPending && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                            <Clock size={14} strokeWidth={2} /> Waiting for lender to review
                          </div>
                        </div>
                      )}

                      {isApproved && loan.backingType === 'savings' && loan.onchainLoanId == null && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            onClick={() => wallet.isGuest ? setShowGuestModal(true) : handleLockCollateral(loan)}
                            disabled={lockingCollateralId === loan.id}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 11, fontSize: 14, fontWeight: 700, color: '#fff', background: '#2563EB', border: 'none', cursor: lockingCollateralId === loan.id ? 'default' : 'pointer', opacity: lockingCollateralId === loan.id ? 0.65 : 1 }}
                          >
                            {lockingCollateralId === loan.id
                              ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Locking…</>
                              : <><PiggyBank size={16} strokeWidth={2} /> Lock {formatXlmAmount(loan.backingAmount)} Collateral</>}
                          </button>
                          {lockError && (
                            <div style={{ display: 'flex', gap: 6, fontSize: 12, color: '#DC2626', maxWidth: 320 }}>
                              <AlertTriangle size={12} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} /> {lockError}
                            </div>
                          )}
                        </div>
                      )}

                      {isApproved && !(loan.backingType === 'savings' && loan.onchainLoanId == null) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
                          <CheckCircle size={14} strokeWidth={2} /> Approved — waiting for lender to disburse funds
                        </div>
                      )}

                      {(isPending || isApproved) && (
                        <button
                          onClick={() => wallet.isGuest ? setShowGuestModal(true) : setCancelingLoan(loan)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} strokeWidth={2} /> Remove
                        </button>
                      )}

                      {loan.status === 'Repaid' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>
                          <CheckCircle size={15} strokeWidth={2} /> Loan repaid — credit score updated
                        </div>
                      )}

                      {loan.status === 'Rejected' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
                          <XCircle size={15} strokeWidth={2} /> Application rejected by lender
                        </div>
                      )}

                      {loan.status === 'Defaulted' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#DC2626', fontWeight: 700 }}>
                          <AlertTriangle size={15} strokeWidth={2} /> Loan defaulted — score penalised −15 pts
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && loans.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={() => nav('/apply')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'var(--green)', background: 'var(--green-tint)', border: '1px solid #BBF7D0', cursor: 'pointer' }}>
              Apply for Another Loan <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <BottomNav active="transaction" walletAddress={wallet.isGuest ? null : wallet.publicKey} />
    </div>
  )
}

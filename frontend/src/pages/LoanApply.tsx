import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, CreditCard, Calendar, Tag, FileText,
  Info, AlertTriangle, ArrowRight, TrendingUp, ChevronRight, Check,
  Users, PiggyBank, Ban,
} from 'lucide-react'
import { scoreTier, SCORE_TIERS, nextScoreTier, formatXlmAmount, xlmToPesoEstimate, formatWallet, stroopsToXlm } from '../lib/stellar'
import { saveLoan, fetchLoans, computeRepaymentScore, type LocalLoan, type BackingType } from '../lib/loanStore'
import { useScore } from '../hooks/useScore'
import { DEMO_SCORE_RECORD, DEMO_LOANS, DEMO_VOUCHERS, DEMO_SAVINGS_AVAILABLE_XLM } from '../lib/demoData'
import GuestActionModal from '../components/GuestActionModal'
import CommunityVouchInfoModal from '../components/CommunityVouchInfoModal'
import SavingsCollateralInfoModal from '../components/SavingsCollateralInfoModal'
import { fetchBorrowerVouchers, fetchSavingsBankAvailable, type OnChainVouch } from '../lib/contracts'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const PURPOSES = ['Business', 'Medical', 'Education', 'Housing', 'Food', 'Other']
const TERMS    = [7, 14, 30]

/** How many more consecutive clean repayments (no defaults) until the Repayment History score next ticks up, and to what value — early repayments can jump several points at once, so this doesn't assume a flat +1. */
function repaymentsUntilNextPoint(totalLoans: number, loansRepaid: number, loansDefaulted: number): { count: number; nextScore: number } | null {
  const current = computeRepaymentScore(totalLoans, loansRepaid, loansDefaulted)
  if (current >= 100) return null
  for (let n = 1; n <= 500; n++) {
    const next = computeRepaymentScore(totalLoans + n, loansRepaid + n, loansDefaulted)
    if (next > current) return { count: n, nextScore: next }
  }
  return null
}

export default function LoanApply({ wallet }: { wallet: WalletHook }) {
  const nav  = useNavigate()
  const { record: liveRecord, isLoading } = useScore(wallet.isGuest ? null : wallet.publicKey)
  const record = wallet.isGuest ? DEMO_SCORE_RECORD : liveRecord
  const score   = record?.score ?? 300
  const tier    = scoreTier(score)
  const next    = nextScoreTier(score)

  const [myLoans, setMyLoans] = useState<LocalLoan[]>([])
  const [loansLoading, setLoansLoading] = useState(true)
  const [amount,    setAmount]    = useState(10)
  const [term,      setTerm]      = useState(7)
  const [purpose,   setPurpose]   = useState('Business')
  const [notes,     setNotes]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showLadder, setShowLadder] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)

  // ── Backing choice: Community Vouch / Savings collateral / None ──
  const [backingType, setBackingType] = useState<BackingType>('none')
  const [savingsAmount, setSavingsAmount] = useState(1)
  const [availableSavings, setAvailableSavings] = useState(0)
  const [savingsFeatureUnavailable, setSavingsFeatureUnavailable] = useState(false)
  const [myVouchers, setMyVouchers] = useState<OnChainVouch[]>([])
  const [vouchersLoading, setVouchersLoading] = useState(true)
  const [showVouchInfo, setShowVouchInfo] = useState(false)
  const [showSavingsInfo, setShowSavingsInfo] = useState(false)

  useEffect(() => {
    if (wallet.isGuest) {
      setMyLoans(DEMO_LOANS as unknown as LocalLoan[])
      setLoansLoading(false)
      setMyVouchers(DEMO_VOUCHERS as unknown as OnChainVouch[])
      setAvailableSavings(DEMO_SAVINGS_AVAILABLE_XLM)
      setVouchersLoading(false)
      return
    }
    if (!wallet.publicKey) return
    fetchLoans(wallet.publicKey).then(l => { setMyLoans(l); setLoansLoading(false) })
    fetchBorrowerVouchers(wallet.publicKey).then(v => { setMyVouchers(v); setVouchersLoading(false) })
    fetchSavingsBankAvailable(wallet.publicKey).then(stroops => {
      if (stroops === null) { setSavingsFeatureUnavailable(true); return }
      setAvailableSavings(stroopsToXlm(stroops))
    })
  }, [wallet.publicKey, wallet.isGuest])

  const totalVouchStake = myVouchers.reduce((s, v) => s + stroopsToXlm(v.stake_amount), 0)
  const safeSavingsAmount = Math.max(0, Math.min(savingsAmount, availableSavings))

  const activeLoan = myLoans.find(l => ['Pending', 'Approved', 'Disbursed'].includes(l.status))

  // Build valid loan amounts for current tier
  const ALL_AMOUNTS = [10, 30, 60, 150, 300, 500, 1000]
  const validAmounts = ALL_AMOUNTS.filter(a => a <= tier.max)

  // Snap amount into valid range if tier changed
  const safeAmount = validAmounts.includes(amount) ? amount : validAmounts[validAmounts.length - 1] ?? 10
  // Round to 2dp, not the nearest whole XLM — these are small fractional amounts now
  const interest = Math.round(safeAmount * (tier.interest / 100) * 100) / 100
  const total    = safeAmount + interest

  async function handleSubmit() {
    if (wallet.isGuest) { setShowGuestModal(true); return }
    if (activeLoan || submitting) return
    if (backingType === 'savings' && (savingsFeatureUnavailable || safeSavingsAmount <= 0)) {
      setSubmitError('Savings Collateral isn\'t available right now — pick a different backing option, or set an amount above 0.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    if (wallet.publicKey) {
      const loan: LocalLoan = {
        id: crypto.randomUUID(),
        amount: safeAmount, interest, total, purpose, term, notes,
        status: 'Pending',
        appliedAt: new Date().toISOString(),
        dueAt: null,
        wallet: wallet.publicKey ?? 'unknown',
        backingType,
        backingAmount: backingType === 'savings' ? safeSavingsAmount : 0,
      }
      try {
        await saveLoan(loan)
      } catch (err: any) {
        console.error('[Bankero] saveLoan error:', err)
        setSubmitting(false)
        setSubmitError(err?.message ?? 'Could not submit your application — please try again.')
        return
      }
    }
    await new Promise(r => setTimeout(r, 800))
    setSubmitted(true)
    setSubmitting(false)
  }

  // ── Success screen ─────────────────────────────────────
  if (submitted) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontFamily: 'var(--font)' }}>
      <div style={{ maxWidth: 440, textAlign: 'center', padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-tint)', border: '2px solid var(--green-border)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} strokeWidth={1.5} color="var(--green)" />
        </div>
        <h2 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 8 }}>Application Submitted</h2>
        <p style={{ color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6 }}>
          A Bankero lender will review your application. You'll see updates in My Loans.
        </p>
        <div style={{ background: 'var(--green-tint)', borderRadius: 16, padding: 20, border: '1px solid var(--green-border)', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Loan amount</p>
          <p className="score-num" style={{ fontSize: 32, color: 'var(--ink)' }}>{formatXlmAmount(safeAmount)}</p>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>Total repayment: {formatXlmAmount(total)} in {term} days · {tier.interest}% interest</p>
        </div>
        <button onClick={() => nav('/loans')} className="btn btn-primary" style={{ width: '100%', padding: '14px 0', fontSize: 15 }}>
          <FileText size={16} strokeWidth={2} /> Track My Loan
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: 32 }}>
      <button onClick={() => nav('/home')} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} strokeWidth={2} /> Back
      </button>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="heading" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>Apply for a Micro-Loan</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>
              {isLoading ? 'Loading your score…' : (
                <>Score: <strong style={{ color: tier.color }}>{score} — {tier.label}</strong> · Limit: <strong>{formatXlmAmount(tier.max)}</strong> · Rate: <strong>{tier.interest}%</strong></>
              )}
            </p>
          </div>
        </div>

        {/* ── Repayment History monitor — how many loans repaid so far, and how many more until the next point ── */}
        {!isLoading && record && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 'var(--r-xl)', background: 'var(--surface)', border: '1px solid var(--border-2)', marginBottom: 20 }}>
            <TrendingUp size={16} strokeWidth={2} color="var(--green)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              <strong style={{ color: 'var(--ink)' }}>{record.loans_repaid}</strong> loans repaid ·
              {' '}Repayment History <strong style={{ color: 'var(--ink)' }}>{record.repayment_score}/100</strong>
              {(() => {
                const next = repaymentsUntilNextPoint(record.total_loans, record.loans_repaid, record.loans_defaulted)
                return next == null
                  ? null
                  : <> · {next.count} more repayment{next.count === 1 ? '' : 's'} to reach {next.nextScore}/100</>
              })()}
            </div>
          </div>
        )}

        {/* ── Active loan blocker ──────────────────────── */}
        {activeLoan && (
          <div style={{ display: 'flex', gap: 14, padding: '18px 20px', borderRadius: 'var(--r-xl)', background: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: 24 }}>
            <AlertTriangle size={20} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>You already have an active loan</p>
              <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.55, marginBottom: 12 }}>
                Repay your current <strong>{activeLoan.status.toLowerCase()}</strong> loan of <strong>{formatXlmAmount(activeLoan.amount)}</strong> first.
              </p>
              <button onClick={() => nav('/loans')} className="btn btn-sm" style={{ background: '#D97706', color: '#fff', border: 'none', borderRadius: 'var(--r-full)' }}>
                View My Loans <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* ── Score tier ladder ────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setShowLadder(l => !l)}
            className="btn"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--r-xl)', background: 'var(--surface)', border: '1px solid var(--border-2)', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={16} strokeWidth={2} color="var(--green)" />
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>How score unlocks loan limits</span>
                {next && !showLadder && (
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', marginLeft: 10 }}>
                    Reach {next.min} → unlock {formatXlmAmount(next.loanMax)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight size={16} strokeWidth={2} color="var(--ink-4)" style={{ transform: showLadder ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }} />
          </button>

          {showLadder && (
            <div style={{ marginTop: 4, background: 'var(--surface)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border-2)', overflow: 'hidden' }}>
              {SCORE_TIERS.map((t, i) => {
                const isCurrent = score >= t.min && score <= t.max
                const isUnlocked = score >= t.min
                return (
                  <div key={t.label} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                    borderBottom: i < SCORE_TIERS.length - 1 ? '1px solid var(--border-2)' : 'none',
                    background: isCurrent ? t.color + '08' : 'transparent',
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: isUnlocked ? t.color : 'var(--border)', flexShrink: 0 }} />
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 600 }}>{t.min}{t.max === t.min ? '' : `–${t.max}`}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? t.color : isUnlocked ? 'var(--ink)' : 'var(--ink-4)' }}>{t.label}</span>
                      {isCurrent && <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 'var(--r-full)', background: t.color, color: '#fff', marginLeft: 8 }}>You</span>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: isUnlocked ? t.color : 'var(--ink-4)' }}>{formatXlmAmount(t.loanMax)}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{xlmToPesoEstimate(t.loanMax)} · {t.interest}% interest</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isUnlocked ? 'var(--green)' : 'var(--ink-4)', width: 20, textAlign: 'center' }}>
                      {isUnlocked ? <Check size={13} color="var(--green)" strokeWidth={2.5} /> : null}
                    </div>
                  </div>
                )
              })}
              {next && (
                <div style={{ padding: '12px 18px', background: 'var(--surface-2)', borderTop: '1px solid var(--border-2)', fontSize: 13, color: 'var(--ink-3)' }}>
                  <TrendingUp size={13} strokeWidth={2} color="var(--green)" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Reach score <strong style={{ color: 'var(--ink)' }}>{next.min}</strong> to unlock{' '}
                  <strong style={{ color: next.color }}>{formatXlmAmount(next.loanMax)}</strong> ({xlmToPesoEstimate(next.loanMax)}) loans. Repay on time to get there faster.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 28,
          border: '1px solid var(--border-2)',
          opacity: activeLoan || loansLoading ? 0.5 : 1,
          pointerEvents: activeLoan || loansLoading ? 'none' : 'auto',
        }}>

          {/* Tier limit info */}
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 'var(--r-md)', background: tier.color + '0D', border: `1px solid ${tier.color}30`, marginBottom: 24, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            <Info size={14} strokeWidth={2} color={tier.color} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong style={{ color: tier.color }}>{tier.label} tier</strong> — borrow up to {' '}
              <strong style={{ color: 'var(--ink)' }}>{formatXlmAmount(tier.max)}</strong> at a flat {tier.interest}% rate.
              {next && <> Reach score <strong style={{ color: 'var(--ink)' }}>{next.min}</strong> to unlock {formatXlmAmount(next.loanMax)}.</>}
            </span>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <CreditCard size={15} strokeWidth={2} color="var(--ink-4)" />
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Loan Amount</label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {validAmounts.map(a => (
                <button key={a} onClick={() => setAmount(a)} className="btn"
                  style={{ flex: '1 1 calc(25% - 8px)', padding: '11px 0', borderRadius: 'var(--r-md)', border: `2px solid ${safeAmount === a ? 'var(--green)' : 'var(--border)'}`, background: safeAmount === a ? 'var(--green-tint)' : 'var(--surface)', color: safeAmount === a ? 'var(--green)' : 'var(--ink-3)', fontSize: 14, fontWeight: 700 }}>
                  {formatXlmAmount(a)}
                </button>
              ))}
            </div>
          </div>

          {/* Term */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Calendar size={15} strokeWidth={2} color="var(--ink-4)" />
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Repayment Term</label>
            </div>
            <div className="term-selector" style={{ display: 'flex', gap: 8 }}>
              {TERMS.map(t => (
                <button key={t} onClick={() => setTerm(t)} className="btn"
                  style={{ flex: 1, padding: '11px 0', borderRadius: 'var(--r-md)', border: `2px solid ${term === t ? 'var(--green)' : 'var(--border)'}`, background: term === t ? 'var(--green-tint)' : 'var(--surface)', color: term === t ? 'var(--green)' : 'var(--ink-3)', fontSize: 14, fontWeight: 700 }}>
                  {t} days
                </button>
              ))}
            </div>
          </div>

          {/* Purpose */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Tag size={15} strokeWidth={2} color="var(--ink-4)" />
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Purpose</label>
            </div>
            <div className="purpose-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {PURPOSES.map(p => (
                <button key={p} onClick={() => setPurpose(p)} className="btn"
                  style={{ padding: '10px 0', borderRadius: 'var(--r-md)', border: `2px solid ${purpose === p ? 'var(--green)' : 'var(--border)'}`, background: purpose === p ? 'var(--green-tint)' : 'var(--surface)', color: purpose === p ? 'var(--green)' : 'var(--ink-3)', fontSize: 13, fontWeight: 700 }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Backing choice */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Users size={15} strokeWidth={2} color="var(--ink-4)" />
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Back Your Application</label>
              <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 400 }}>(optional — improves your approval odds)</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[
                { key: 'vouch' as const,   label: 'Community Vouch',   Icon: Users,     onInfo: () => setShowVouchInfo(true) },
                { key: 'savings' as const, label: 'Savings Collateral', Icon: PiggyBank, onInfo: () => setShowSavingsInfo(true) },
                { key: 'none' as const,    label: 'None',              Icon: Ban,       onInfo: null },
              ].map(opt => (
                <button key={opt.key} onClick={() => setBackingType(opt.key)} className="btn"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 6px', borderRadius: 'var(--r-md)', border: `2px solid ${backingType === opt.key ? 'var(--green)' : 'var(--border)'}`, background: backingType === opt.key ? 'var(--green-tint)' : 'var(--surface)', color: backingType === opt.key ? 'var(--green)' : 'var(--ink-3)' }}>
                  <opt.Icon size={16} strokeWidth={2} />
                  <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{opt.label}</span>
                  {opt.onInfo && (
                    <span
                      onClick={e => { e.stopPropagation(); opt.onInfo!() }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--ink-4)', fontWeight: 600 }}
                    >
                      <Info size={10} strokeWidth={2} /> How it works
                    </span>
                  )}
                </button>
              ))}
            </div>

            {backingType === 'savings' && (
              <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                {savingsFeatureUnavailable ? (
                  <p style={{ fontSize: 12.5, color: '#B45309', margin: 0, lineHeight: 1.5 }}>
                    Savings Collateral isn't live yet — this feature needs a contract update that hasn't been deployed. Check back soon, or pick a different backing option for now.
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Amount to lock (XLM)</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{formatXlmAmount(availableSavings)} available</span>
                    </div>
                    {availableSavings > 0 ? (
                      <>
                        <input
                          type="range" min={0} max={availableSavings} step={0.5}
                          value={safeSavingsAmount}
                          onChange={e => setSavingsAmount(Number(e.target.value))}
                          style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)' }}>
                          <span>0 XLM</span>
                          <span style={{ fontWeight: 800, color: 'var(--green)' }}>{formatXlmAmount(safeSavingsAmount)}</span>
                          <span>{formatXlmAmount(availableSavings)}</span>
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0, lineHeight: 1.5 }}>
                        You don't have any available savings yet — deposit into the Savings Bank first to use this option.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {backingType === 'vouch' && (
              <div style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                {vouchersLoading ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0 }}>Loading your vouchers…</p>
                ) : myVouchers.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--ink-4)', margin: 0, lineHeight: 1.5 }}>
                    No one has vouched for you yet — share your wallet address on the Vouch page to get backers.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {myVouchers.map(v => {
                      const stakeXlm = stroopsToXlm(v.stake_amount)
                      const share = totalVouchStake > 0 ? (stakeXlm / totalVouchStake) * 100 : 0
                      const rewardXlm = stakeXlm * 0.01 * 1.05
                      return (
                        <div key={v.voucher} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{formatWallet(v.voucher)}</span>
                          <span style={{ color: 'var(--ink-3)' }}>{formatXlmAmount(stakeXlm)} · {share.toFixed(0)}%</span>
                          <span style={{ fontWeight: 700, color: 'var(--green)' }}>+{rewardXlm.toFixed(2)} XLM ({xlmToPesoEstimate(rewardXlm)}) if repaid</span>
                        </div>
                      )
                    })}
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 6, marginTop: 2, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
                      <span>Total staked for you</span><span>{formatXlmAmount(totalVouchStake)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {showVouchInfo && <CommunityVouchInfoModal onClose={() => setShowVouchInfo(false)} />}
          {showSavingsInfo && <SavingsCollateralInfoModal onClose={() => setShowSavingsInfo(false)} />}

          {/* Notes */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <FileText size={15} strokeWidth={2} color="var(--ink-4)" />
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                Notes <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span>
              </label>
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Tell the lender more about your need…"
              rows={3}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: 'var(--ink)' }}
            />
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16, border: '1px solid var(--border-2)' }}>
            {[['Principal', formatXlmAmount(safeAmount)], [`Interest (${tier.interest}% flat)`, formatXlmAmount(interest)]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-3)', marginBottom: 6 }}>
                <span>{l}</span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
              <span>Total Repayment</span><span>{formatXlmAmount(total)}</span>
            </div>
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6, fontSize: 12, color: 'var(--ink-4)' }}>
              <Calendar size={11} strokeWidth={2} /> Due in {term} days from disbursement
            </p>
          </div>

          {/* How it works */}
          <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 'var(--r-md)', background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 20, fontSize: 13, color: '#1D4ED8', lineHeight: 1.55 }}>
            <Info size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>How Bankero loans work:</strong> You're applying to a verified Bankero lender — a real person or institution on our platform. Bankero connects borrowers and lenders; it does not lend its own money. Your lender reviews your score and decides.
            </span>
          </div>

          {showGuestModal && <GuestActionModal onClose={() => setShowGuestModal(false)} />}

          {submitError && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 'var(--r-md)', background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 16, fontSize: 13, color: '#DC2626', lineHeight: 1.55 }}>
              <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span><strong>Couldn't submit your application.</strong> {submitError} Please try again.</span>
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '15px 0', fontSize: 15, borderRadius: 'var(--r-lg)', opacity: submitting ? 0.65 : 1 }}>
            {submitting
              ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
              : <>Submit Loan Application</>
            }
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

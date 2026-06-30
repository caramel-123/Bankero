import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, CreditCard, Calendar, Tag, FileText,
  Info, AlertTriangle, ArrowRight, TrendingUp, ChevronRight, Check,
} from 'lucide-react'
import { scoreTier, SCORE_TIERS, nextScoreTier, formatPeso } from '../lib/stellar'
import { saveLoan, fetchLoans, type LocalLoan } from '../lib/loanStore'
import { useScore } from '../hooks/useScore'
import { DEMO_SCORE_RECORD, DEMO_LOANS } from '../lib/demoData'
import GuestActionModal from '../components/GuestActionModal'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const PURPOSES = ['Business', 'Medical', 'Education', 'Housing', 'Food', 'Other']
const TERMS    = [7, 14, 30]

export default function LoanApply({ wallet }: { wallet: WalletHook }) {
  const nav  = useNavigate()
  const { record: liveRecord, isLoading } = useScore(wallet.isGuest ? null : wallet.publicKey)
  const record = wallet.isGuest ? DEMO_SCORE_RECORD : liveRecord
  const score   = record?.score ?? 300
  const tier    = scoreTier(score)
  const next    = nextScoreTier(score)

  const [myLoans, setMyLoans] = useState<LocalLoan[]>([])
  const [loansLoading, setLoansLoading] = useState(true)
  const [amount,    setAmount]    = useState(500)
  const [term,      setTerm]      = useState(7)
  const [purpose,   setPurpose]   = useState('Business')
  const [notes,     setNotes]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showLadder, setShowLadder] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)

  useEffect(() => {
    if (wallet.isGuest) {
      setMyLoans(DEMO_LOANS as unknown as LocalLoan[])
      setLoansLoading(false)
      return
    }
    if (!wallet.publicKey) return
    fetchLoans(wallet.publicKey).then(l => { setMyLoans(l); setLoansLoading(false) })
  }, [wallet.publicKey, wallet.isGuest])

  const activeLoan = myLoans.find(l => ['Pending', 'Approved', 'Disbursed'].includes(l.status))

  // Build valid loan amounts for current tier
  const ALL_AMOUNTS = [500, 1500, 3000, 7500, 15000, 25000, 50000]
  const validAmounts = ALL_AMOUNTS.filter(a => a <= tier.max)

  // Snap amount into valid range if tier changed
  const safeAmount = validAmounts.includes(amount) ? amount : validAmounts[validAmounts.length - 1] ?? 500
  const interest = Math.round(safeAmount * (tier.interest / 100))
  const total    = safeAmount + interest

  async function handleSubmit() {
    if (wallet.isGuest) { setShowGuestModal(true); return }
    if (activeLoan || submitting) return
    setSubmitting(true)
    if (wallet.publicKey) {
      const loan: LocalLoan = {
        id: crypto.randomUUID(),
        amount: safeAmount, interest, total, purpose, term, notes,
        status: 'Pending',
        appliedAt: new Date().toISOString(),
        dueAt: null,
        wallet: wallet.publicKey ?? 'unknown',
      }
      try { await saveLoan(loan) } catch (err) { console.error('[Bankero] saveLoan error:', err) }
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
          <p className="score-num" style={{ fontSize: 32, color: 'var(--ink)' }}>{formatPeso(safeAmount)}</p>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>Total repayment: {formatPeso(total)} in {term} days · {tier.interest}% interest</p>
        </div>
        <button onClick={() => nav('/loans')} className="btn btn-primary" style={{ width: '100%', padding: '14px 0', fontSize: 15 }}>
          <FileText size={16} strokeWidth={2} /> Track My Loan
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: 32 }}>
      <button onClick={() => nav('/dashboard')} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} strokeWidth={2} /> Back
      </button>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="heading" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>Apply for a Micro-Loan</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>
              {isLoading ? 'Loading your score…' : (
                <>Score: <strong style={{ color: tier.color }}>{score} — {tier.label}</strong> · Limit: <strong>{formatPeso(tier.max)}</strong> · Rate: <strong>{tier.interest}%</strong></>
              )}
            </p>
          </div>
        </div>

        {/* ── Active loan blocker ──────────────────────── */}
        {activeLoan && (
          <div style={{ display: 'flex', gap: 14, padding: '18px 20px', borderRadius: 'var(--r-xl)', background: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: 24 }}>
            <AlertTriangle size={20} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>You already have an active loan</p>
              <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.55, marginBottom: 12 }}>
                Repay your current <strong>{activeLoan.status.toLowerCase()}</strong> loan of <strong>{formatPeso(activeLoan.amount)}</strong> first.
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
                    Reach {next.min} → unlock {formatPeso(next.loanMax)}
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
                      <div style={{ fontSize: 15, fontWeight: 800, color: isUnlocked ? t.color : 'var(--ink-4)' }}>{formatPeso(t.loanMax)}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{t.interest}% interest</div>
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
                  <strong style={{ color: next.color }}>{formatPeso(next.loanMax)}</strong> loans. Repay on time to get there faster.
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
              <strong style={{ color: 'var(--ink)' }}>{formatPeso(tier.max)}</strong> at a flat {tier.interest}% rate.
              {next && <> Reach score <strong style={{ color: 'var(--ink)' }}>{next.min}</strong> to unlock {formatPeso(next.loanMax)}.</>}
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
                  {formatPeso(a)}
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
            {[['Principal', formatPeso(safeAmount)], [`Interest (${tier.interest}% flat)`, formatPeso(interest)]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-3)', marginBottom: 6 }}>
                <span>{l}</span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
              <span>Total Repayment</span><span>{formatPeso(total)}</span>
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

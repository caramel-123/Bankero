import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, CreditCard, Calendar, Tag, FileText, Info, AlertTriangle, ArrowRight } from 'lucide-react'
import { scoreTier, formatPeso } from '../lib/stellar'
import { saveLoan, getLoans } from '../lib/loanStore'
import { useScore } from '../hooks/useScore'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const PURPOSES = ['Pang-negosyo','Gamot','Pang-aral','Bahay','Pagkain','Iba pa']
const TERMS    = [7, 14, 30]

export default function LoanApply({ wallet }: { wallet: WalletHook }) {
  const nav  = useNavigate()
  const { record, isLoading } = useScore(wallet.publicKey)
  const score = record?.score ?? 300
  const tier  = scoreTier(score)

  const [amount,    setAmount]    = useState(tier.max === 500 ? 500 : 500)
  const [term,      setTerm]      = useState(7)
  const [purpose,   setPurpose]   = useState('Pang-negosyo')
  const [notes,     setNotes]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  const interest = Math.round(amount * 0.05)
  const total    = amount + interest

  // Check for existing active loan (blocks new application)
  const allLoans  = getLoans()
  const myLoans   = allLoans.filter(l => l.wallet === wallet.publicKey || l.wallet === 'unknown')
  const activeLoan = myLoans.find(l => ['Pending','Approved','Disbursed'].includes(l.status))

  // Valid amounts for this tier
  const validAmounts = [500, 2000, 5000, 10000].filter(a => a <= tier.max)

  function handleSubmit() {
    if (activeLoan) return
    const loan = {
      id: crypto.randomUUID(),
      amount, interest, total, purpose, term, notes,
      status: 'Pending' as const,
      appliedAt: new Date().toISOString(),
      dueAt: null,
      wallet: wallet.publicKey ?? 'unknown',
    }
    saveLoan(loan)
    setSubmitted(true)
  }

  /* ── Success screen ────────────────────────────────────── */
  if (submitted) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontFamily: 'var(--font)' }}>
      <div style={{ maxWidth: 440, textAlign: 'center', padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-tint)', border: '2px solid var(--green-border)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} strokeWidth={1.5} color="var(--green)" />
        </div>
        <h2 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 8 }}>Application Submitted</h2>
        <p style={{ color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6 }}>
          Your loan application is pending lender approval. You'll be notified when a lender approves and disburses.
        </p>
        <div style={{ background: 'var(--green-tint)', borderRadius: 16, padding: 20, border: '1px solid var(--green-border)', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>Loan amount</p>
          <p className="score-num" style={{ fontSize: 32, color: 'var(--ink)' }}>{formatPeso(amount)}</p>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>Total repayment: {formatPeso(total)} in {term} days</p>
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

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 className="heading" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>Apply for a Micro-Loan</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: 28, fontSize: 15 }}>
          {isLoading ? 'Loading your score…' : (
            <>Score: <strong style={{ color: tier.color }}>{score} ({tier.label})</strong> · Loan limit: <strong>{formatPeso(tier.max)}</strong></>
          )}
        </p>

        {/* ── Active loan blocker ─────────────────────────── */}
        {activeLoan && (
          <div style={{ display: 'flex', gap: 14, padding: '18px 20px', borderRadius: 'var(--r-xl)', background: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: 24 }}>
            <AlertTriangle size={20} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                You already have an active loan
              </p>
              <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.55, marginBottom: 12 }}>
                You can only have one active loan at a time. Repay or wait for your current{' '}
                <strong>{activeLoan.status.toLowerCase()}</strong> loan of{' '}
                <strong>{formatPeso(activeLoan.amount)}</strong> before applying for a new one.
              </p>
              <button onClick={() => nav('/loans')} className="btn btn-sm" style={{ background: '#D97706', color: '#fff', border: 'none', borderRadius: 'var(--r-full)' }}>
                View My Loans <ArrowRight size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 28, border: '1px solid var(--border-2)', opacity: activeLoan ? 0.5 : 1, pointerEvents: activeLoan ? 'none' : 'auto' }}>

          {/* Tier limit banner */}
          {tier.max < 10000 && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', marginBottom: 24, fontSize: 13, color: 'var(--ink-3)' }}>
              <Info size={14} strokeWidth={2} color="var(--ink-4)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Your current score ({score}) allows loans up to{' '}
                <strong style={{ color: 'var(--ink)' }}>{formatPeso(tier.max)}</strong>.
                Repay loans to unlock higher limits.
              </span>
            </div>
          )}

          {/* Amount */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <CreditCard size={15} strokeWidth={2} color="var(--ink-4)" />
              <label style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Loan Amount</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {validAmounts.map(a => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className="btn"
                  style={{ flex: 1, padding: '11px 0', borderRadius: 'var(--r-md)', border: `2px solid ${amount === a ? 'var(--green)' : 'var(--border)'}`, background: amount === a ? 'var(--green-tint)' : 'var(--surface)', color: amount === a ? 'var(--green)' : 'var(--ink-3)', fontSize: 14, fontWeight: 700 }}
                >
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
            <div style={{ display: 'flex', gap: 8 }}>
              {TERMS.map(t => (
                <button
                  key={t}
                  onClick={() => setTerm(t)}
                  className="btn"
                  style={{ flex: 1, padding: '11px 0', borderRadius: 'var(--r-md)', border: `2px solid ${term === t ? 'var(--green)' : 'var(--border)'}`, background: term === t ? 'var(--green-tint)' : 'var(--surface)', color: term === t ? 'var(--green)' : 'var(--ink-3)', fontSize: 14, fontWeight: 700 }}
                >
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {PURPOSES.map(p => (
                <button
                  key={p}
                  onClick={() => setPurpose(p)}
                  className="btn"
                  style={{ padding: '10px 0', borderRadius: 'var(--r-md)', border: `2px solid ${purpose === p ? 'var(--green)' : 'var(--border)'}`, background: purpose === p ? 'var(--green-tint)' : 'var(--surface)', color: purpose === p ? 'var(--green)' : 'var(--ink-3)', fontSize: 13, fontWeight: 700 }}
                >
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
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tell the lender a bit more about your need..."
              rows={3}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: 'var(--ink)' }}
            />
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 20, border: '1px solid var(--border-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-3)', marginBottom: 6 }}>
              <span>Principal</span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatPeso(amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--ink-3)', marginBottom: 6 }}>
              <span>Interest (5% flat)</span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatPeso(interest)}</span>
            </div>
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
              <span>Total Repayment</span><span>{formatPeso(total)}</span>
            </div>
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 6, fontSize: 12, color: 'var(--ink-4)' }}>
              <Calendar size={11} strokeWidth={2} /> Due in {term} days from disbursement
            </p>
          </div>

          {/* Lender model clarification */}
          <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', marginBottom: 20, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            <Info size={15} strokeWidth={2} color="var(--ink-4)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong style={{ color: 'var(--ink)' }}>How Bankero loans work:</strong> You are applying to a verified Bankero lender — a real person or institution registered on the platform. Bankero connects borrowers and lenders; it does not lend its own money. Your lender reviews your credit score and decides whether to approve.
            </span>
          </div>

          <button onClick={handleSubmit} className="btn btn-primary" style={{ width: '100%', padding: '15px 0', fontSize: 15, borderRadius: 'var(--r-lg)' }}>
            Submit Loan Application
          </button>
        </div>
      </div>
    </div>
  )
}

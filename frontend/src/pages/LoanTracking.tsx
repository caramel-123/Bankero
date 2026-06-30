import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, ArrowRight, Clock, CheckCircle, Zap,
  AlertTriangle, XCircle, RefreshCw, CreditCard, TrendingUp, X
} from 'lucide-react'
import { formatPeso, scoreTier, scorePercent } from '../lib/stellar'
import {
  fetchLoans, updateLoanStatus, updateScoreOnRepay, updateScoreOnDefault,
  computeLocalScore, getScoreCache, daysUntil, formatDate,
  type LocalLoan, type LoanStatus
} from '../lib/loanStore'
import { DEMO_LOANS, DEMO_SCORE_RECORD } from '../lib/demoData'
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
function RepayModal({ loan, wallet, onConfirm, onClose }: {
  loan: LocalLoan; wallet: string; onConfirm: () => void; onClose: () => void
}) {
  const cache = getScoreCache(wallet)
  const scoreBefore = computeLocalScore(cache.repayment_score, 0, 0, 0)
  const total = cache.total_loans + 1
  const repaid = cache.loans_repaid + 1
  // Laplace smoothing preview
  const newRepayment = Math.min(100, Math.round((repaid / (total + 2)) * 100))
  const scoreAfter = computeLocalScore(newRepayment, 0, 0, 0)
  const scoreDiff = scoreAfter - scoreBefore
  const tierAfter = scoreTier(scoreAfter)

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
          {[['Principal', formatPeso(loan.amount)], ['Interest (5%)', formatPeso(loan.interest)]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: 'var(--ink-3)' }}>{l}</span>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>
            <span>Total to Pay</span><span style={{ color: 'var(--green)' }}>{formatPeso(loan.total)}</span>
          </div>
        </div>

        <div style={{ background: 'var(--green-tint)', borderRadius: 14, padding: 16, border: '1px solid #BBF7D0', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#15803D', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={14} strokeWidth={2} /> Score impact after repayment
          </div>
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

        <button onClick={onConfirm} style={{ width: '100%', padding: '15px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', background: 'var(--green)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(22,163,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <CheckCircle size={17} strokeWidth={2} /> Confirm Repayment — {formatPeso(loan.total)}
        </button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer' }}>
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
    if (wallet.isGuest) {
      // Demo: simulate repayment success using demo score data
      setRepayingLoan(null)
      setActiveTab('Repaid')
      setSuccessInfo({ newScore: DEMO_SCORE_RECORD.score + 8, diff: 8 })
      return
    }
    const w = wallet.publicKey ?? repayingLoan.wallet
    const cacheBefore = getScoreCache(w)
    const scoreBefore = computeLocalScore(cacheBefore.repayment_score, 0, 0, 0)
    await updateLoanStatus(repayingLoan.id, 'Repaid')
    const updated = await updateScoreOnRepay(w)
    const scoreAfter = computeLocalScore(updated.repayment_score, 0, 0, 0)
    setRepayingLoan(null)
    setActiveTab('Repaid')
    await refresh()
    setSuccessInfo({ newScore: scoreAfter, diff: scoreAfter - scoreBefore })
  }

  const tabLoans = loans.filter(l => l.status === activeTab)
  const counts: Partial<Record<LoanStatus, number>> = {}
  for (const l of loans) counts[l.status] = (counts[l.status] ?? 0) + 1
  const visibleTabs = TABS.filter(t => (counts[t] ?? 0) > 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: 32 }}>

      {repayingLoan && wallet.publicKey && (
        <RepayModal loan={repayingLoan} wallet={wallet.publicKey} onConfirm={handleRepayConfirm} onClose={() => setRepayingLoan(null)} />
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

      <button onClick={() => nav('/dashboard')} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} strokeWidth={2} /> Back
      </button>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>My Loans</h1>
            <p style={{ color: 'var(--ink-3)' }}>{loading ? 'Loading…' : `${loans.length} loan${loans.length !== 1 ? 's' : ''} total`}</p>
          </div>
          <button onClick={refresh} className="btn btn-ghost btn-sm" disabled={loading}>
            <RefreshCw size={14} strokeWidth={2} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
          </button>
        </div>

        {/* Summary strip */}
        {loans.length > 0 && (
          <div className="loan-summary-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Applied', value: formatPeso(loans.reduce((s, l) => s + l.amount, 0)), color: 'var(--ink)' },
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
                          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{formatPeso(loan.amount)}</span>
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
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{formatPeso(loan.total)}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>+{formatPeso(loan.interest)} interest</div>
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
                        <button onClick={() => setRepayingLoan(loan)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 11, fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--green)', border: 'none', cursor: 'pointer', boxShadow: '0 3px 12px rgba(22,163,74,.28)' }}>
                          <CheckCircle size={16} strokeWidth={2} /> Repay Loan — {formatPeso(loan.total)}
                        </button>
                      )}

                      {isPending && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 13, fontWeight: 600, color: '#92400E' }}>
                            <Clock size={14} strokeWidth={2} /> Waiting for lender to review
                          </div>
                        </div>
                      )}

                      {isApproved && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
                          <CheckCircle size={14} strokeWidth={2} /> Approved — waiting for lender to disburse funds
                        </div>
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
    </div>
  )
}

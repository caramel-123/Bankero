import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, ArrowRight, Clock, CheckCircle, Zap,
  AlertTriangle, XCircle, RefreshCw, CreditCard, TrendingUp, X, Users, Banknote, ChevronDown, Info, Trash2,
} from 'lucide-react'
import { formatPeso, scoreTier, scorePercent } from '../lib/stellar'
import {
  fetchLoans, updateLoanStatus, updateScoreOnRepay, updateScoreOnDefault, deleteLoan,
  computeLocalScore, getScoreCache, daysUntil, formatDate,
  type LocalLoan, type LoanStatus
} from '../lib/loanStore'
import { DEMO_LOANS, DEMO_SCORE_RECORD } from '../lib/demoData'
import { useScore } from '../hooks/useScore'
import GuestActionModal from '../components/GuestActionModal'
import BottomNav from '../components/BottomNav'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const SCORE_FACTORS = [
  {
    key: 'repayment_score', label: 'Repayment History', weight: 40, color: 'var(--green-soft)', Icon: TrendingUp,
    desc: 'The single biggest factor. Every on-time repayment raises this; a default lowers it by 15 points.',
    formula: 'round( loans_repaid / (total_loans + 2) × 100 ) − (loans_defaulted × 15)',
    variables: [
      ['loans_repaid', 'Loans you have fully paid back.'],
      ['total_loans', 'All loans that have reached a final outcome (repaid or defaulted). Loans still pending or active don’t count yet.'],
      ['loans_defaulted', 'Loans you failed to repay.'],
      ['+2', 'A "trust buffer" — stops brand-new borrowers from hitting a perfect score after just 1–2 loans. It matters less the longer your history gets.'],
      ['× 15', 'A flat penalty subtracted per default, on top of the ratio already being worse.'],
    ],
    example: [
      '7 loans total, 6 repaid, 1 defaulted →',
      'round( 6 ÷ (7+2) × 100 ) − (1 × 15) = round(66.7) − 15 = 67 − 15 = 52',
    ],
  },
  {
    key: 'tx_score', label: 'Transaction Activity', weight: 25, color: '#60A5FA', Icon: RefreshCw,
    desc: 'How active you are across Bankero features — Savings Bank deposits, savings streaks, and Paluwagan contributions all add capped bonus points here.',
    formula: 'min( 100, savings_bank_bonus + savings_streak_bonus + paluwagan_bonus )',
    variables: [
      ['savings_bank_bonus', '+2 per Savings Bank deposit, capped at 20 total.'],
      ['savings_streak_bonus', '+10 per weekly savings streak milestone reached, capped at 30 total.'],
      ['paluwagan_bonus', '+3 per on-time Paluwagan contribution, capped at 15 per group — but stacks across multiple groups.'],
      ['min(100, …)', 'The three bonuses are added together, then capped so the total can never exceed 100.'],
    ],
    example: [
      '6 Savings Bank deposits, 2 streak milestones, 4 on-time Paluwagan contributions →',
      'savings_bank_bonus = 6×2 = 12   savings_streak_bonus = 2×10 = 20   paluwagan_bonus = 4×3 = 12',
      'min( 100, 12+20+12 ) = min(100, 44) = 44',
    ],
  },
  {
    key: 'vouch_score', label: 'Community Vouches', weight: 20, color: '#FBBF24', Icon: Users,
    desc: 'XLM staked by other members vouching for you. More total stake means a higher score.',
    formula: 'min( 100, total_xlm_staked ÷ 10 )',
    variables: [
      ['total_xlm_staked', 'The sum of active XLM stakes from everyone currently vouching for you (minimum 50 XLM per vouch).'],
      ['÷ 10', 'Converts staked XLM into score points — 1,000 XLM staked in total reaches the maximum score of 100.'],
      ['min(100, …)', 'Caps the score at 100 no matter how much is staked beyond that.'],
    ],
    example: [
      '3 members vouch for you — 200, 150, and 150 XLM staked →',
      'total_xlm_staked = 200+150+150 = 500',
      'min( 100, 500 ÷ 10 ) = min(100, 50) = 50',
    ],
  },
  {
    key: 'anchor_score', label: 'Remittance', weight: 15, color: '#A78BFA', Icon: Banknote,
    desc: 'AI-verified e-payment scans add points here — tap the camera icon to scan a receipt and grow this factor.',
    formula: 'min( 100, verified_scans × 2 )',
    variables: [
      ['verified_scans', 'The number of e-payment screenshots you’ve scanned with the camera that passed AI verification.'],
      ['× 2', 'Each verified scan is worth 2 points, capped at 20 points total from scanning.'],
      ['min(100, …)', 'Keeps the overall factor within the 0–100 scale.'],
    ],
    example: [
      '5 verified e-payment scans →',
      'min( 100, 5 × 2 ) = min(100, 10) = 10',
    ],
  },
] as const

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

// ── Score info modal ────────────────────────────────────────
function ScoreInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,31,58,.5)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div style={{ width: 560, maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px rgba(11,31,58,.24)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F1F5F9', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
          <X size={15} strokeWidth={2} />
        </button>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(96,165,250,.12)', border: '1.5px solid rgba(96,165,250,.3)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <Info size={24} strokeWidth={1.75} color="#3B82F6" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>How your credit score is calculated</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.6 }}>
          Your 300–850 credit score is built from four factors, each measured 0–100 and weighted differently. Here's exactly how each one is computed.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SCORE_FACTORS.map(f => {
            const Icon = f.Icon
            return (
              <div key={f.key} style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', padding: '18px 20px', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: f.color + '18', display: 'grid', placeItems: 'center', color: f.color, flexShrink: 0 }}>
                    <Icon size={14} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', background: 'var(--surface-3)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>{f.weight}% of score</span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 12 }}>{f.desc}</p>

                <div style={{ background: 'var(--ink)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, overflowX: 'auto' }}>
                  <code style={{ fontSize: 12, color: '#4ADE80', fontFamily: 'monospace', whiteSpace: 'pre' }}>{f.formula}</code>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {f.variables.map(([term, meaning]) => (
                    <div key={term} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                      <code style={{ color: f.color, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>{term}</code>
                      <span style={{ color: 'var(--ink-3)' }}>{meaning}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border-2)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Example</div>
                  {f.example.map((line, i) => (
                    <p key={i} style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontFamily: i > 0 ? 'monospace' : 'inherit' }}>{line}</p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Overall score formula */}
        <div style={{ marginTop: 20, borderRadius: 'var(--r-lg)', border: '1.5px solid #BBF7D0', padding: '18px 20px', background: 'var(--green-tint)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: 'rgba(22,163,74,.15)', display: 'grid', placeItems: 'center', color: '#16A34A', flexShrink: 0 }}>
              <TrendingUp size={14} strokeWidth={2} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Putting it together — your overall 300–850 score</span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 12 }}>
            Each factor above (0–100) is multiplied by its weight and added up, then that total is rescaled onto the 300–850 range every lender sees. It happens in two steps.
          </p>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#15803D', marginBottom: 6 }}>Step 1 — weighted raw score</div>
          <div style={{ background: 'var(--ink)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, overflowX: 'auto' }}>
            <code style={{ fontSize: 12, color: '#4ADE80', fontFamily: 'monospace', whiteSpace: 'pre' }}>
              score_raw = (repayment_score × 40) + (tx_score × 25) + (vouch_score × 20) + (anchor_score × 15)
            </code>
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#15803D', marginBottom: 6 }}>Step 2 — rescale to 300–850</div>
          <div style={{ background: 'var(--ink)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, overflowX: 'auto' }}>
            <code style={{ fontSize: 12, color: '#4ADE80', fontFamily: 'monospace', whiteSpace: 'pre' }}>
              final_score = round( 300 + (score_raw × 550 ÷ 10,000) )
            </code>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {[
              ['score_raw', 'The weighted sum from Step 1. Since each factor tops out at 100 and the weights add up to 100, the highest score_raw can ever be is 100 × 100 = 10,000.'],
              ['300', 'The floor — every borrower starts here, even with a score_raw of 0.'],
              ['550', 'The full width of the score range (850 − 300), spread across score_raw\'s 0–10,000 range.'],
              ['÷ 10,000', 'Converts score_raw down to a 0–1 fraction of that 550-point range before adding it to the 300 floor.'],
            ].map(([term, meaning]) => (
              <div key={term} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                <code style={{ color: '#16A34A', fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>{term}</code>
                <span style={{ color: 'var(--ink-3)' }}>{meaning}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '12px 14px', border: '1px solid #BBF7D0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Example</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              Repayment 80, Transactions 65, Vouches 50, Remittance 20 →<br />
              score_raw = (80×40)+(65×25)+(50×20)+(20×15) = 3,200+1,625+1,000+300 = <strong style={{ color: 'var(--ink)' }}>6,125</strong><br />
              final_score = 300 + (6,125 × 550 ÷ 10,000) = 300 + 337 = <strong style={{ color: '#16A34A' }}>637</strong>
            </p>
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', marginTop: 20, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer' }}>
          Got it
        </button>
      </div>
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
          This cancels your application for <strong style={{ color: 'var(--ink)' }}>{formatPeso(loan.amount)}</strong>. Since it hasn't been disbursed yet, this won't affect your credit score.
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
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [cancelingLoan, setCancelingLoan] = useState<LocalLoan | null>(null)

  const { record: liveRecord, isLoading: scoreLoading } = useScore(wallet.isGuest ? null : wallet.publicKey)
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
        <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
          <h3 className="heading" style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 4 }}>How your score is calculated</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>Tap any factor for details on how it's measured.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SCORE_FACTORS.map(f => {
              const Icon = f.Icon
              const value = (scoreRecord?.[f.key] ?? 0) as number
              const isOpen = expandedFactor === f.key
              return (
                <div key={f.key} style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', overflow: 'hidden' }}>
                  <button
                    onClick={() => setExpandedFactor(isOpen ? null : f.key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', border: 'none', background: 'var(--surface)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: f.color + '18', display: 'grid', placeItems: 'center', color: f.color, flexShrink: 0 }}>
                      <Icon size={15} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{f.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', background: 'var(--surface-3)', padding: '1px 7px', borderRadius: 'var(--r-full)' }}>{f.weight}%</span>
                      </div>
                      <div className="progress-track" style={{ marginTop: 7, height: 6 }}>
                        {scoreLoading
                          ? <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-full)' }} />
                          : <div className="progress-fill" style={{ width: `${value}%`, background: f.color }} />
                        }
                      </div>
                    </div>
                    <span className="score-num" style={{ fontSize: 15, color: 'var(--ink-2)', flexShrink: 0 }}>
                      {scoreLoading ? '—' : value}<span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/100</span>
                    </span>
                    <ChevronDown size={16} strokeWidth={2} color="var(--ink-4)" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                  </button>
                  <div style={{
                    maxHeight: isOpen ? 80 : 0, opacity: isOpen ? 1 : 0,
                    overflow: 'hidden', transition: 'max-height 220ms ease, opacity 200ms ease',
                    background: 'var(--surface-2)',
                  }}>
                    <p style={{ margin: 0, padding: '12px 16px 14px 60px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55 }}>{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
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
                        <button onClick={() => wallet.isGuest ? setShowGuestModal(true) : setRepayingLoan(loan)}
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
      <BottomNav active="transaction" />
    </div>
  )
}

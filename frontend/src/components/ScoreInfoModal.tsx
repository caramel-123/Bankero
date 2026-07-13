import { TrendingUp, RefreshCw, Users, Banknote, X, Info } from 'lucide-react'

export const SCORE_FACTORS = [
  {
    key: 'repayment_score', label: 'Repayment History', weight: 40, color: 'var(--green-soft)', Icon: TrendingUp,
    desc: 'Measures how reliably you pay back what you borrow — the ratio of loans you\'ve fully repaid against your total loan history, with a built-in trust buffer so a brand-new borrower can\'t hit a perfect score off one loan. It\'s the single biggest factor in your overall score: every on-time repayment raises it, while a default lowers it by a flat 15 points on top of an already-worse ratio.',
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
    desc: 'Measures how actively and consistently you use Bankero\'s savings and community features — not one-off activity, but a habit. Savings Bank deposits, weekly savings streaks, and on-time Paluwagan contributions each add their own capped bonus, rewarding people who keep showing up over time rather than making a single large deposit.',
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
    desc: 'Measures how much your community trusts you — real XLM that other members have staked to vouch for your reliability. Vouching isn\'t free: vouchers risk their own stake if you default, so every vouch is a genuine signal of trust, not just a click. More total stake, from more people, pushes this factor higher.',
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
    desc: 'Measures real-world financial activity happening outside Bankero — e-wallet transfers, remittances, and other payments you scan with the camera icon. An AI verifier reads the screenshot and checks it\'s a genuine, non-duplicate transaction before it counts, so this factor reflects income and cash flow proof a lender can\'t see anywhere else in the app.',
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

export default function ScoreInfoModal({ onClose }: { onClose: () => void }) {
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

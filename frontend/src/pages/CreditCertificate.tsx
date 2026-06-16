import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Shield, CheckCircle, Star, User } from 'lucide-react'
import { scoreTier, scorePercent, SCORE_TIERS } from '../lib/stellar'
import { getScoreCache, computeLocalScore, getLoans } from '../lib/loanStore'
import { getUser, type User as BorrowerUser } from '../lib/supabase'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

function certId(wallet: string) {
  let hash = 0
  for (let i = 0; i < wallet.length; i++) hash = ((hash << 5) - hash + wallet.charCodeAt(i)) | 0
  return 'BNK-' + Math.abs(hash).toString(36).toUpperCase().slice(0, 8)
}

function formatLongDate(d: Date) {
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function CreditCertificate({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const printRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(300)
  const [profile, setProfile] = useState<BorrowerUser | null>(null)

  const loans = getLoans().filter(l => l.wallet === (wallet.publicKey ?? ''))
  const repaid    = loans.filter(l => l.status === 'Repaid')
  const defaulted = loans.filter(l => l.status === 'Defaulted')
  const total     = loans.filter(l => ['Repaid','Defaulted','Disbursed'].includes(l.status))
  const cache     = getScoreCache(wallet.publicKey ?? '')
  const tier      = scoreTier(score)
  const pct       = scorePercent(score)
  const issuedAt  = new Date()
  const validUntil = new Date(issuedAt)
  validUntil.setFullYear(validUntil.getFullYear() + 1)
  const id        = certId(wallet.publicKey ?? 'unknown')
  const repayRate = total.length > 0 ? Math.round((repaid.length / total.length) * 100) : 0

  useEffect(() => {
    if (!wallet.publicKey) return
    const s = computeLocalScore(cache.repayment_score, 0, 0, 0)
    setScore(s)
    getUser(wallet.publicKey).then(u => setProfile(u)).catch(() => {})
    setLoading(false)
  }, [wallet.publicKey])

  function handlePrint() {
    window.print()
  }

  if (!wallet.publicKey) return null
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const qualifies = score >= 450 && repaid.length >= 1

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: '28px 24px' }}>

      {/* Toolbar — hidden on print */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, maxWidth: 760, margin: '0 auto 28px' }}>
        <button onClick={() => nav('/dashboard')} className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} strokeWidth={2} /> Back
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint} className="btn btn-primary" style={{ borderRadius: 'var(--r-lg)', padding: '10px 20px', fontSize: 14 }}>
            <Download size={15} strokeWidth={2} /> Download / Print PDF
          </button>
        </div>
      </div>

      {/* Eligibility notice */}
      {!qualifies && (
        <div className="no-print" style={{ maxWidth: 760, margin: '0 auto 20px', display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 'var(--r-lg)', background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <Star size={16} strokeWidth={2} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
            <strong>Certificate not yet earned.</strong> You need at least 1 repaid loan and a score of 450+ to generate a valid credit certificate. Keep building your history!
          </p>
        </div>
      )}

      {/* ── CERTIFICATE (printable) ── */}
      <div ref={printRef} id="bankero-certificate" style={{
        maxWidth: 760,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 20,
        border: '2px solid #15803D',
        overflow: 'hidden',
        boxShadow: '0 8px 48px rgba(0,0,0,.12)',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>

        {/* Green header bar */}
        <div style={{ background: 'linear-gradient(135deg, #14532D 0%, #15803D 50%, #16A34A 100%)', padding: '32px 40px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 200, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', border: '1.5px solid rgba(255,255,255,.25)' }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, fontFamily: 'sans-serif' }}>₱</span>
                </div>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 20, fontFamily: 'sans-serif', letterSpacing: '-0.02em' }}>Bankero</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, fontFamily: 'sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                Decentralized Credit Platform · Stellar Network
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: qualifies ? 'rgba(255,255,255,.2)' : 'rgba(220,38,38,.4)', border: `1.5px solid ${qualifies ? 'rgba(255,255,255,.35)' : 'rgba(254,202,202,.5)'}` }}>
                <Shield size={13} strokeWidth={2} color="#fff" />
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: '0.06em' }}>
                  {qualifies ? 'VERIFIED' : 'UNVERIFIED'}
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 10, fontFamily: 'sans-serif', marginTop: 6, margin: '6px 0 0' }}>Cert ID: {id}</p>
            </div>
          </div>
        </div>

        {/* Certificate body */}
        <div style={{ padding: '36px 40px' }}>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 12, color: '#6B7280', fontFamily: 'sans-serif', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>This is to certify that</p>
            <h1 style={{ fontSize: 28, color: '#111827', fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em' }}>Credit Standing Certificate</h1>
            <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, #15803D, #4ADE80)', borderRadius: 999, margin: '0 auto 16px' }} />
            <p style={{ fontSize: 13, color: '#374151', fontFamily: 'sans-serif', lineHeight: 1.7, maxWidth: 540, margin: '0 auto' }}>
              The holder of the Stellar wallet address shown below has established a verifiable credit history on the Bankero platform and is recognized as a responsible borrower.
            </p>
          </div>

          {/* Borrower Profile block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 14, background: '#F9FAFB', border: '1px solid #E5E7EB', marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${tier.color}22, ${tier.color}44)`, border: `2px solid ${tier.color}40`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <User size={22} strokeWidth={1.5} color={tier.color} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 3px' }}>
                {profile?.display_name ?? 'Bankero Borrower'}
              </p>
              <p style={{ fontSize: 11, color: '#6B7280', fontFamily: 'monospace', margin: '0 0 4px', wordBreak: 'break-all' }}>{wallet.publicKey}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile?.kyc_verified && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#DCFCE7', color: '#15803D' }}>✓ KYC Verified</span>
                )}
                {profile?.anchor_linked && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#EFF6FF', color: '#3B82F6' }}>✓ GCash/Maya Linked</span>
                )}
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#F3F4F6', color: '#6B7280' }}>
                  Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : formatLongDate(issuedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Wallet + Score block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start', marginBottom: 28 }}>

            {/* Left: wallet */}
            <div style={{ background: '#F9FAFB', borderRadius: 14, padding: '20px 22px', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Stellar Wallet (Verified On-Chain)</p>
              <p style={{ fontSize: 11, color: '#111827', fontFamily: 'monospace', wordBreak: 'break-all', margin: '0 0 14px', lineHeight: 1.7 }}>{wallet.publicKey}</p>

              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Issued</p>
                  <p style={{ fontSize: 12, color: '#374151', fontFamily: 'sans-serif', fontWeight: 600, margin: 0 }}>{formatLongDate(issuedAt)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Valid Until</p>
                  <p style={{ fontSize: 12, color: '#374151', fontFamily: 'sans-serif', fontWeight: 600, margin: 0 }}>{formatLongDate(validUntil)}</p>
                </div>
              </div>
            </div>

            {/* Right: score */}
            <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', borderRadius: 14, padding: '20px 24px', border: `2px solid ${tier.color}30`, textAlign: 'center', minWidth: 140 }}>
              <p style={{ fontSize: 10, color: '#6B7280', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Credit Score</p>
              <p style={{ fontSize: 52, fontWeight: 800, color: tier.color, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1, margin: '0 0 6px' }}>{score}</p>
              <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 999, background: tier.color, color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'sans-serif' }}>{tier.label}</span>
              {/* Score bar */}
              <div style={{ marginTop: 12, height: 5, background: '#E5E7EB', borderRadius: 999 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${tier.color}, #4ADE80)`, borderRadius: 999 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#9CA3AF', fontFamily: 'sans-serif', marginTop: 3 }}>
                <span>300</span><span>850</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Loans Taken',   value: total.length,      color: '#374151' },
              { label: 'Loans Repaid',  value: repaid.length,     color: '#15803D' },
              { label: 'Defaults',      value: defaulted.length,  color: defaulted.length > 0 ? '#DC2626' : '#6B7280' },
              { label: 'Repayment Rate', value: `${repayRate}%`,  color: repayRate >= 80 ? '#15803D' : repayRate >= 50 ? '#D97706' : '#DC2626' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace', margin: '0 0 3px' }}>{s.value}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Loan history table */}
          {repaid.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Repayment History</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'sans-serif' }}>
                <thead>
                  <tr style={{ background: '#F3F4F6' }}>
                    {['Date Applied', 'Purpose', 'Amount (₱)', 'Term', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: '1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loans.filter(l => ['Repaid','Defaulted'].includes(l.status)).map((loan, i) => (
                    <tr key={loan.id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                      <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB', color: '#374151' }}>{new Date(loan.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB', color: '#374151' }}>{loan.purpose || '—'}</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB', color: '#374151', fontFamily: 'monospace' }}>{loan.amount.toLocaleString('en-PH')}</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB', color: '#374151' }}>{loan.term} days</td>
                      <td style={{ padding: '8px 12px', border: '1px solid #E5E7EB' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                          background: loan.status === 'Repaid' ? '#DCFCE7' : '#FEE2E2',
                          color:      loan.status === 'Repaid' ? '#15803D' : '#DC2626' }}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Score tier ladder */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Score Tier Context</p>
            <div style={{ display: 'flex', gap: 4 }}>
              {SCORE_TIERS.map(t => (
                <div key={t.label} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, background: score >= t.min && score <= t.max ? t.color : '#F3F4F6', border: `2px solid ${score >= t.min && score <= t.max ? t.color : 'transparent'}` }}>
                  <p style={{ fontSize: 8, fontWeight: 700, color: score >= t.min && score <= t.max ? '#fff' : '#9CA3AF', fontFamily: 'sans-serif', margin: 0 }}>{t.label}</p>
                  <p style={{ fontSize: 7, color: score >= t.min && score <= t.max ? 'rgba(255,255,255,.8)' : '#D1D5DB', fontFamily: 'sans-serif', margin: 0 }}>{t.min}–{t.max === 850 ? '850' : t.max}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Declaration box */}
          <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '18px 22px', border: '1px solid #BBF7D0', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckCircle size={18} strokeWidth={2} color="#15803D" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#166534', fontFamily: 'sans-serif', margin: 0, lineHeight: 1.7 }}>
                <strong>Bankero hereby certifies</strong> that the above wallet holder has established a verifiable on-chain credit history via the Bankero platform on the Stellar blockchain. All repayment records are immutably recorded and can be independently verified using the wallet address on the Stellar network explorer at{' '}
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>stellar.expert/explorer/testnet</span>.
                This certificate may be presented to financial institutions as evidence of creditworthiness.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
            <div>
              <div style={{ width: 120, height: 2, background: '#111827', marginBottom: 6 }} />
              <p style={{ fontSize: 11, color: '#374151', fontFamily: 'sans-serif', fontWeight: 600, margin: '0 0 2px' }}>Bankero Platform</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', margin: 0 }}>Automated · Blockchain-Verified</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', margin: '0 0 2px' }}>Certificate Reference</p>
              <p style={{ fontSize: 13, color: '#111827', fontFamily: 'monospace', fontWeight: 700, margin: 0 }}>{id}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', marginTop: 3 }}>
                Verify at: bankero.vercel.app
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Usage tip */}
      <div className="no-print" style={{ maxWidth: 760, margin: '20px auto 0', display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border-2)' }}>
        <Shield size={15} strokeWidth={2} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink)' }}>How to use this certificate:</strong> Click "Download / Print PDF", then save as PDF. You can email or present this to rural banks, cooperatives, or any lending institution as proof of your responsible borrowing history on the Bankero platform.
        </p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #bankero-certificate, #bankero-certificate * { visibility: visible !important; }
          #bankero-certificate { position: fixed !important; top: 0; left: 0; width: 100% !important; box-shadow: none !important; border-radius: 0 !important; border: none !important; margin: 0 !important; }
          .no-print { display: none !important; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

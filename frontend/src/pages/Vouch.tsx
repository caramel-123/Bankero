import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, Users, AlertTriangle, Info,
  Search, TrendingUp, ExternalLink, XCircle,
} from 'lucide-react'
import { scoreTier, scorePercent, formatWallet, stellarExplorerUrl } from '../lib/stellar'
import { getScoreCacheFromSupabase } from '../lib/supabase'
import { computeLocalScore } from '../lib/loanStore'
import { DEMO_SCORE_RECORD, DEMO_WALLET } from '../lib/demoData'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

// Resolve a borrower's score from Supabase score_cache
async function lookupBorrowerScore(wallet: string): Promise<{
  score: number; repayment: number; tx: number; vouch: number; anchor: number;
  totalLoans: number; loansRepaid: number; loansDefaulted: number
} | null> {
  try {
    const cache = await getScoreCacheFromSupabase(wallet)
    if (!cache) return null
    const score = computeLocalScore(cache.repayment_score, 0, cache.loans_repaid > 0 ? 10 : 0, 0)
    return {
      score,
      repayment: cache.repayment_score,
      tx: 0,
      vouch: 0,
      anchor: 0,
      totalLoans: cache.total_loans,
      loansRepaid: cache.loans_repaid,
      loansDefaulted: cache.loans_defaulted,
    }
  } catch {
    return null
  }
}

export default function Vouch({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [search, setSearch]   = useState(wallet.isGuest ? DEMO_WALLET : '')
  const [stake, setStake]     = useState(50)
  const [vouched, setVouched] = useState(false)
  const [looking, setLooking] = useState(false)
  const [borrower, setBorrower] = useState<{
    wallet: string; score: number; repayment: number; tx: number; vouch: number; anchor: number;
    totalLoans: number; loansRepaid: number; loansDefaulted: number
  } | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)

  // Is the searched address the same as the logged-in wallet?
  const isSelfVouch = !wallet.isGuest && search.trim().length > 10 && wallet.publicKey
    ? search.trim().toLowerCase() === wallet.publicKey.toLowerCase()
    : false

  // Debounced lookup when address reaches minimum Stellar address length (56 chars)
  const doLookup = useCallback(async (addr: string) => {
    if (addr.length < 56) { setBorrower(null); setLookupError(null); return }
    if (!wallet.isGuest && wallet.publicKey && addr.toLowerCase() === wallet.publicKey.toLowerCase()) {
      setBorrower(null); setLookupError(null); return
    }
    // Guest mode: return demo borrower data for the demo wallet
    if (wallet.isGuest && addr === DEMO_WALLET) {
      setBorrower({
        wallet: DEMO_WALLET,
        score: DEMO_SCORE_RECORD.score,
        repayment: DEMO_SCORE_RECORD.repayment_score,
        tx: DEMO_SCORE_RECORD.tx_score,
        vouch: DEMO_SCORE_RECORD.vouch_score,
        anchor: DEMO_SCORE_RECORD.anchor_score,
        totalLoans: DEMO_SCORE_RECORD.total_loans,
        loansRepaid: DEMO_SCORE_RECORD.loans_repaid,
        loansDefaulted: DEMO_SCORE_RECORD.loans_defaulted,
      })
      return
    }
    setLooking(true)
    setLookupError(null)
    setBorrower(null)
    const result = await lookupBorrowerScore(addr)
    if (result) {
      setBorrower({ wallet: addr, ...result })
      setLookupError(null)
    } else {
      setLookupError('No Bankero profile found for this wallet. They may not have connected yet.')
    }
    setLooking(false)
  }, [wallet.publicKey, wallet.isGuest])

  useEffect(() => {
    const t = setTimeout(() => doLookup(search.trim()), 600)
    return () => clearTimeout(t)
  }, [search, doLookup])

  function handleVouch() {
    if (!canVouch) return
    // Guest: simulate vouch with a short delay
    if (wallet.isGuest) {
      setTimeout(() => setVouched(true), 600)
      return
    }
    setVouched(true)
  }

  const tier = borrower ? scoreTier(borrower.score) : null
  const canVouch = !isSelfVouch && borrower && !looking && search.length >= 56

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: 32 }}>
      <button onClick={() => nav('/dashboard')} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={15} strokeWidth={2} /> Back
      </button>

      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 className="heading" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>Community Vouching</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: 28, lineHeight: 1.6 }}>
          Stake XLM to vouch for a borrower. Help them build their credit — and earn 1% when they repay.
        </p>

        {vouched ? (
          <div style={{ background: 'var(--green-tint)', borderRadius: 20, padding: 48, border: '1px solid var(--green-border)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', border: '2px solid #BBF7D0', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} strokeWidth={1.5} color="#16A34A" />
            </div>
            <h3 className="heading" style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>Vouch Submitted!</h3>
            <p style={{ color: 'var(--ink-3)', marginBottom: 6, lineHeight: 1.6 }}>
              Your <strong>{stake} XLM</strong> stake for <strong>{formatWallet(search.trim())}</strong> is now locked.
            </p>
            <p style={{ color: 'var(--ink-4)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
              Stake is released when their loan is repaid. If they default, your stake goes to the lender.
            </p>
            <button onClick={() => { setVouched(false); setSearch(''); setBorrower(null) }}
              className="btn btn-primary" style={{ borderRadius: 'var(--r-lg)', padding: '12px 24px' }}>
              <Users size={15} strokeWidth={2} /> Vouch Again
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Address input */}
            <div className="card" style={{ padding: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 7 }}>
                Borrower's Stellar Wallet Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="G... (56-character Stellar address)"
                  className="input"
                  style={{ paddingLeft: 42, paddingRight: 40, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                />
                <Search size={14} strokeWidth={2} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
                {looking && (
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
                )}
              </div>

              {/* Self-vouch block */}
              {isSelfVouch && (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', background: '#FEF2F2', border: '1px solid #FECACA', marginTop: 10 }}>
                  <XCircle size={15} strokeWidth={2} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.5 }}>
                    <strong>You cannot vouch for your own wallet.</strong> Only other community members can vouch for you.
                  </p>
                </div>
              )}

              {/* Lookup error */}
              {lookupError && !isSelfVouch && (
                <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--amber-tint)', border: '1px solid var(--amber-border)', marginTop: 10 }}>
                  <AlertTriangle size={14} strokeWidth={2} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>{lookupError}</p>
                </div>
              )}
            </div>

            {/* Borrower profile card — shown once address resolves */}
            {borrower && tier && !isSelfVouch && (
              <div className="card" style={{ padding: 24, border: `1.5px solid ${tier.color}30` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: tier.color + '18', border: `2px solid ${tier.color}30`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Users size={20} strokeWidth={1.75} color={tier.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', marginBottom: 3 }}>{formatWallet(borrower.wallet)}</p>
                      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 'var(--r-full)', background: tier.color, color: '#fff', fontSize: 12, fontWeight: 700 }}>{tier.label}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="score-num" style={{ fontSize: 44, color: tier.color, lineHeight: 1 }}>{borrower.score}</div>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>Credit score</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="progress-track" style={{ marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: `${scorePercent(borrower.score)}%`, background: `linear-gradient(90deg, ${tier.color}, #4ADE80)` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', fontWeight: 700, marginBottom: 18 }}>
                  <span>300</span><span>850</span>
                </div>

                {/* Loan stats */}
                <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 14 }}>
                  {[
                    { label: 'Total Loans',  value: borrower.totalLoans },
                    { label: 'Repaid',       value: borrower.loansRepaid },
                    { label: 'Defaulted',    value: borrower.loansDefaulted },
                  ].map((s, i) => (
                    <div key={s.label} style={{ flex: 1, padding: '12px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border-2)' : 'none' }}>
                      <div className="score-num" style={{ fontSize: 20, color: s.label === 'Defaulted' && s.value > 0 ? '#DC2626' : 'var(--ink)' }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Repayment rate bar */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 5 }}>
                    <span style={{ fontWeight: 600 }}>Repayment History</span>
                    <span className="score-num" style={{ fontSize: 13, color: 'var(--ink)' }}>{borrower.repayment}/100</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${borrower.repayment}%`, background: 'var(--green-soft)' }} />
                  </div>
                </div>

                {/* Explorer link */}
                <a href={stellarExplorerUrl(borrower.wallet)} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--green)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--ink-4)'}>
                  <ExternalLink size={11} strokeWidth={2} /> View on Stellar Explorer
                </a>
              </div>
            )}

            {/* Stake selector */}
            <div className="card" style={{ padding: 24, opacity: canVouch ? 1 : 0.5 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 10 }}>
                Stake Amount (XLM)
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[50, 100, 250, 500].map(s => (
                  <button key={s} onClick={() => setStake(s)} className="btn"
                    style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--r-md)', border: `2px solid ${stake === s ? 'var(--green)' : 'var(--border)'}`, background: stake === s ? 'var(--green-tint)' : 'var(--surface)', color: stake === s ? 'var(--green)' : 'var(--ink-3)', fontSize: 14, fontWeight: 700 }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-4)' }}>
                <Info size={12} strokeWidth={2} /> Min 50 XLM. Slashed to lender if borrower defaults.
              </div>
            </div>

            {/* Incentive info */}
            <div style={{ display: 'flex', gap: 10, padding: 14, borderRadius: 'var(--r-lg)', background: 'var(--amber-tint)', border: '1px solid var(--amber-border)' }}>
              <TrendingUp size={15} strokeWidth={2} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                You earn <strong>1% of the repayment</strong> (~{(stake * 0.01 * 1.05).toFixed(2)} XLM) if the borrower repays on time. Their score also increases, strengthening the community.
              </p>
            </div>

            {/* Submit */}
            <button
              onClick={handleVouch}
              disabled={!canVouch}
              className="btn btn-primary"
              style={{ width: '100%', padding: '15px 0', fontSize: 15, borderRadius: 'var(--r-lg)', opacity: canVouch ? 1 : 0.45, cursor: canVouch ? 'pointer' : 'not-allowed' }}
            >
              <Users size={16} strokeWidth={2} /> Stake &amp; Vouch for {borrower ? formatWallet(borrower.wallet) : 'Borrower'}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

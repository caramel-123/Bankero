import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, TrendingUp, RefreshCw, Users, Banknote,
  Lightbulb, RotateCw, Link2, CheckCircle, X, Plus, Trash2,
  Download, Copy, Check, ExternalLink,
} from 'lucide-react'
import { scoreTier, scorePercent, formatWallet, stellarExplorerUrl } from '../lib/stellar'
import { useScore } from '../hooks/useScore'
import {
  PROVIDERS, getLinkedAccounts, linkAccount, unlinkAccount, syncTransactions,
  type PaymentProvider,
} from '../lib/anchorStore'
import { DEMO_SCORE_RECORD, DEMO_WALLET } from '../lib/demoData'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

/* ── Link Payment Modal ───────────────────────────────────── */
function LinkModal({
  provider, wallet, onClose, onLinked,
}: {
  provider: PaymentProvider
  wallet: string
  onClose: () => void
  onLinked: () => void
}) {
  const [value, setValue] = useState('')
  const [step, setStep] = useState<'input' | 'verify' | 'done'>('input')

  function handleLink() {
    if (!value.trim()) return
    setStep('verify')
    setTimeout(() => {
      linkAccount(wallet, {
        id: provider.id,
        name: provider.name,
        accountRef: value.trim(),
        linkedAt: new Date().toISOString(),
        scoreBoost: provider.scoreBoost,
        txCount: 0,
        lastSynced: null,
      })
      setStep('done')
    }, 1200)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(17,26,21,.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32, position: 'relative' }}>
        <button onClick={onClose} className="btn btn-icon" style={{ position: 'absolute', top: 16, right: 16 }}>
          <X size={15} strokeWidth={2} />
        </button>

        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-tint)', border: '2px solid var(--green-border)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} strokeWidth={1.5} color="var(--green)" />
            </div>
            <h3 className="heading" style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
              {provider.name} linked!
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 6 }}>
              Anchor score increased by <strong style={{ color: 'var(--green)' }}>+{provider.scoreBoost} pts</strong>.
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 28 }}>Your credit score will update shortly.</p>
            <button onClick={() => { onLinked(); onClose() }} className="btn btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 15 }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--r-lg)', background: provider.color + '18', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: provider.color }}>{provider.name[0]}</span>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>{provider.category}</p>
                <h3 className="heading" style={{ fontSize: 18, color: 'var(--ink)' }}>Link {provider.name}</h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--green-tint)', border: '1px solid var(--green-border)', marginBottom: 22 }}>
              <TrendingUp size={14} strokeWidth={2} color="var(--green)" />
              <span style={{ fontSize: 13, color: 'var(--green-hi)', fontWeight: 600 }}>
                Adds <strong>+{provider.scoreBoost} pts</strong> to your Anchor / Remittance score
              </span>
            </div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 7 }}>
              {provider.id === 'instapay' || provider.category === 'Bank' ? 'Account Number' : 'Registered Mobile Number'}
            </label>
            <input
              className="input"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={provider.placeholder}
              style={{ marginBottom: 8 }}
              disabled={step === 'verify'}
            />
            <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 22 }}>
              Used to verify your account only. We don't store your credentials.
            </p>

            <button
              onClick={handleLink}
              disabled={!value.trim() || step === 'verify'}
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px 0', fontSize: 15, opacity: !value.trim() ? 0.5 : 1 }}
            >
              {step === 'verify' ? (
                <>
                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                  Verifying…
                </>
              ) : (
                <><Link2 size={15} strokeWidth={2} /> Link Account</>
              )}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

/* ── Main page ────────────────────────────────────────────── */
export default function ScoreDetails({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const { record: liveRecord, isLoading, refresh } = useScore(wallet.isGuest ? null : wallet.publicKey)
  const record = wallet.isGuest ? DEMO_SCORE_RECORD : liveRecord
  const score = record?.score ?? 300
  const tier  = scoreTier(score)
  const pct   = scorePercent(score)

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null)
  const [_tick, setTick] = useState(0)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ id: string; count: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const linked = wallet.isGuest ? [] : (wallet.publicKey ? getLinkedAccounts(wallet.publicKey) : [])

  function handleUnlink(providerId: string) {
    if (!wallet.publicKey) return
    unlinkAccount(wallet.publicKey, providerId)
    setTick(n => n + 1)
    refresh()
  }

  function handleSync(providerId: string) {
    if (!wallet.publicKey || syncing) return
    setSyncing(providerId)
    setSyncResult(null)
    setTimeout(() => {
      const txs = syncTransactions(wallet.publicKey!, providerId)
      setSyncing(null)
      setSyncResult({ id: providerId, count: txs.length })
      setTick(n => n + 1)
      refresh()
      setTimeout(() => setSyncResult(null), 4000)
    }, 1800)
  }

  function copyAddress() {
    if (!wallet.publicKey) return
    navigator.clipboard.writeText(wallet.publicKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const factors = [
    { label: 'Repayment History',   weight: 40, score: record?.repayment_score ?? 0, color: 'var(--green-soft)', Icon: TrendingUp, desc: 'Pay loans on time — biggest factor at 40%.' },
    { label: 'Transaction Activity', weight: 25, score: record?.tx_score ?? 0,        color: '#60A5FA',           Icon: RefreshCw,  desc: 'Active use of your Stellar wallet over 30 days.' },
    { label: 'Community Vouches',   weight: 20, score: record?.vouch_score ?? 0,      color: '#FBBF24',           Icon: Users,      desc: 'XLM staked by community members vouching for you.' },
    { label: 'Anchor / Remittance', weight: 15, score: record?.anchor_score ?? 0,     color: '#A78BFA',           Icon: Banknote,   desc: 'Linked GCash, Maya, or bank account history.' },
  ]

  const totalBoost = linked.reduce((s, a) => s + a.scoreBoost, 0)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: '28px 32px' }}>
      <button onClick={() => nav('/dashboard')} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} strokeWidth={2} /> Back
      </button>

      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="heading" style={{ fontSize: 26, color: 'var(--ink)' }}>Your Credit Score</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
              <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>
                {wallet.isGuest ? `${formatWallet(DEMO_WALLET)} · Demo Mode` : (wallet.publicKey ? `${formatWallet(wallet.publicKey)} · Live from Stellar testnet` : '—')}
              </p>
              {wallet.publicKey && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={copyAddress}
                    className="btn btn-sm"
                    title="Copy full wallet address"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: copied ? 'var(--green-hi)' : 'var(--ink-4)', background: copied ? 'var(--green-tint)' : 'var(--surface-3)', border: `1px solid ${copied ? 'var(--green-border)' : 'var(--border)'}`, borderRadius: 'var(--r-full)', transition: 'all 200ms' }}
                  >
                    {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
                    {copied ? 'Copied!' : 'Copy address'}
                  </button>
                  <a
                    href={stellarExplorerUrl(wallet.publicKey)}
                    target="_blank" rel="noreferrer"
                    title="View on Stellar Expert blockchain explorer"
                    style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--ink-4)', textDecoration: 'none', flexShrink: 0, transition: 'background 150ms, color 150ms' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--green-tint)'; el.style.color = 'var(--green-hi)'; el.style.borderColor = 'var(--green-border)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--surface-3)'; el.style.color = 'var(--ink-4)'; el.style.borderColor = 'var(--border)' }}
                  >
                    <ExternalLink size={12} strokeWidth={2} />
                  </a>
                </div>
              )}
            </div>
          </div>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--ink-4)' }}>
              <RotateCw size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Fetching…
            </div>
          )}
        </div>

        {/* Score card */}
        <div className="panel-card" style={{ padding: '32px 36px' }}>
          <div style={{ position: 'absolute', top: -60, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,.2) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, position: 'relative', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.38)', marginBottom: 8 }}>On-Chain Credit Score</p>
              {isLoading
                ? <div className="skeleton" style={{ width: 140, height: 88, borderRadius: 'var(--r-lg)' }} />
                : <div className="score-num" style={{ fontSize: 96, color: '#fff', lineHeight: 1 }}>{score}</div>
              }
            </div>
            {!isLoading && (
              <div style={{ paddingBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ display: 'inline-flex', padding: '5px 14px', borderRadius: 'var(--r-full)', background: tier.color, color: '#fff', fontSize: 14, fontWeight: 700 }}>{tier.label}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,.5)' }}>Max loan: <strong style={{ color: '#fff' }}>₱{tier.max.toLocaleString()}</strong></span>
              </div>
            )}
          </div>
          <div className="progress-track" style={{ height: 10, marginBottom: 6 }}>
            <div className="progress-fill" style={{ width: isLoading ? '0%' : `${pct}%`, background: `linear-gradient(90deg, ${tier.color}, #4ADE80)` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 700, marginBottom: 20 }}>
            <span>300 — Starting Out</span><span>850 — Excellent</span>
          </div>
          {record && (
            <div style={{ display: 'flex', gap: 28, borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 18, position: 'relative' }}>
              {[['Total Loans', record.total_loans], ['Repaid', record.loans_repaid], ['Defaulted', record.loans_defaulted]].map(([l, v]) => (
                <div key={l as string}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 4 }}>{l}</p>
                  <p className="score-num" style={{ fontSize: 24, color: '#fff' }}>{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Factor breakdown */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 22 }}>Score Breakdown</h3>
          {factors.map(f => {
            const Icon = f.Icon
            return (
              <div key={f.label} style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 'var(--r-md)', background: f.color + '18', display: 'grid', placeItems: 'center', color: f.color }}>
                      <Icon size={14} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{f.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-4)', background: 'var(--surface-3)', padding: '1px 7px', borderRadius: 'var(--r-full)' }}>{f.weight}%</span>
                  </div>
                  <span className="score-num" style={{ fontSize: 15, color: f.score > 0 ? f.color : 'var(--ink-4)' }}>
                    {isLoading ? '—' : f.score}<span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/100</span>
                  </span>
                </div>
                <div className="progress-track" style={{ marginBottom: 5 }}>
                  {isLoading
                    ? <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-full)' }} />
                    : <div className="progress-fill" style={{ width: `${f.score}%`, background: f.color }} />
                  }
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>{f.desc}</p>
              </div>
            )
          })}
        </div>

        {/* ── LINK PAYMENT ACCOUNTS ─────────────────────────── */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>Link Payment Accounts</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                GCash, Maya, ShopeePay and more — each boosts your Anchor / Remittance score.
              </p>
            </div>
            {totalBoost > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--r-full)', background: 'var(--green-tint)', border: '1px solid var(--green-border)', fontSize: 12, fontWeight: 700, color: 'var(--green-hi)', flexShrink: 0 }}>
                +{totalBoost} pts earned
              </span>
            )}
          </div>

          {/* Already linked accounts */}
          {linked.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {linked.map(acc => {
                const p = PROVIDERS.find(pr => pr.id === acc.id)
                const isSyncing = syncing === acc.id
                const justSynced = syncResult?.id === acc.id
                const txBonus = Math.min(30, Math.floor((acc.txCount ?? 0) / 2))
                return (
                  <div key={acc.id} style={{ borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: (p?.color ?? '#888') + '20', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: p?.color ?? '#888' }}>{acc.name[0]}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{acc.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                          {acc.accountRef}
                          {acc.txCount > 0 && <> · <span style={{ color: 'var(--ink-3)' }}>{acc.txCount} transactions synced</span></>}
                          {txBonus > 0 && <> · <span style={{ color: 'var(--green)' }}>+{txBonus} activity pts</span></>}
                        </p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'var(--green-tint)', padding: '2px 9px', borderRadius: 'var(--r-full)', flexShrink: 0 }}>+{acc.scoreBoost} pts</span>
                      <CheckCircle size={15} strokeWidth={2} color="var(--green)" style={{ flexShrink: 0 }} />
                      <button
                        onClick={() => handleSync(acc.id)}
                        disabled={!!syncing}
                        className="btn btn-sm"
                        title="Sync recent transactions for score boost"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: justSynced ? 'var(--green-hi)' : 'var(--ink-3)', background: justSynced ? 'var(--green-tint)' : 'var(--surface)', border: `1px solid ${justSynced ? 'var(--green-border)' : 'var(--border)'}`, borderRadius: 'var(--r-full)', flexShrink: 0, opacity: syncing && !isSyncing ? 0.4 : 1 }}
                      >
                        {isSyncing
                          ? <div style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(0,0,0,.15)', borderTopColor: 'var(--ink-3)', animation: 'spin 0.8s linear infinite' }} />
                          : justSynced
                          ? <Check size={11} strokeWidth={2.5} />
                          : <Download size={11} strokeWidth={2} />
                        }
                        {isSyncing ? 'Syncing…' : justSynced ? `+${syncResult?.count} txns!` : 'Sync'}
                      </button>
                      <button onClick={() => handleUnlink(acc.id)} className="btn btn-icon" style={{ width: 28, height: 28, flexShrink: 0 }} title="Unlink">
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>
                    {justSynced && (
                      <div style={{ padding: '10px 16px', background: 'var(--green-tint)', borderTop: '1px solid var(--green-border)', fontSize: 12, color: 'var(--green-hi)', fontWeight: 600 }}>
                        Synced {syncResult?.count} new transactions from {acc.name} — your Anchor score updated!
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Unlinked providers grid */}
          {linked.length < PROVIDERS.length && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: 10 }}>
              {PROVIDERS.filter(p => !linked.find(l => l.id === p.id)).map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p)}
                  className="btn hover-lift"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border-2)', textAlign: 'left', cursor: 'pointer', transition: 'transform 160ms var(--ease-out), box-shadow 160ms var(--ease-out)' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: p.color + '18', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: p.color }}>{p.name[0]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>+{p.scoreBoost} pts</p>
                  </div>
                  <Plus size={13} strokeWidth={2.5} color="var(--ink-4)" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
          {linked.length === PROVIDERS.length && (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', paddingTop: 8 }}>All payment accounts linked.</p>
          )}
        </div>

        {/* Tips */}
        <div style={{ display: 'flex', gap: 14, padding: 20, borderRadius: 'var(--r-xl)', background: 'var(--amber-tint)', border: '1px solid var(--amber-border)' }}>
          <Lightbulb size={18} strokeWidth={2} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>How to increase your score</p>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 13, color: '#78350F', lineHeight: 1.9 }}>
              <li>Repay your first loan on time — biggest impact (40%)</li>
              <li>Ask a member with score 500+ to vouch for you</li>
              <li>Stay active on your Stellar wallet with regular transactions</li>
              <li>Link GCash, Maya, or your bank account above (15%)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Link modal */}
      {selectedProvider && wallet.publicKey && (
        <LinkModal
          provider={selectedProvider}
          wallet={wallet.publicKey}
          onClose={() => setSelectedProvider(null)}
          onLinked={() => { setTick(n => n + 1); refresh() }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, BarChart2, CreditCard, FileText, Users, LogOut,
  ArrowRight, ChevronRight, RefreshCw, Copy, Check, Globe, Award,
} from 'lucide-react'
import { stellarExplorerUrl } from '../lib/stellar'
import { scoreTier, scorePercent, formatWallet, formatPeso } from '../lib/stellar'
import { useScore } from '../hooks/useScore'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const NAV = [
  { icon: Home,       label: 'Dashboard',   path: '/dashboard' },
  { icon: BarChart2,  label: 'My Score',    path: '/score' },
  { icon: CreditCard, label: 'Apply Loan',  path: '/apply' },
  { icon: FileText,   label: 'My Loans',    path: '/loans' },
  { icon: Users,      label: 'Vouch',       path: '/vouch' },
  { icon: Award,      label: 'Certificate', path: '/certificate' },
]

export default function Dashboard({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const { record, isLoading } = useScore(wallet.publicKey)
  const [copied, setCopied] = useState(false)

  function copyAddress() {
    if (!wallet.publicKey) return
    navigator.clipboard.writeText(wallet.publicKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const score   = record?.score ?? 300
  const tier    = scoreTier(score)
  const pct     = scorePercent(score)
  const path    = window.location.pathname

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside style={{
        width: 232, flexShrink: 0,
        background: 'var(--panel)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 14px',
        position: 'sticky', top: 0, height: '100dvh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 10px', marginBottom: 28 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center' }}>
            <span style={{ color: 'var(--panel-hi)', fontWeight: 900, fontSize: 13 }}>₱</span>
          </div>
          <span className="heading" style={{ fontSize: 16, color: '#fff' }}>
            Bank<span style={{ color: 'var(--panel-hi)' }}>e</span>ro
          </span>
        </div>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => {
            const Icon  = n.icon
            const active = path === n.path
            return (
              <button
                key={n.path}
                onClick={() => nav(n.path)}
                className={`sidenav-btn${active ? ' active' : ''}`}
              >
                <Icon size={16} strokeWidth={2} />
                {n.label}
              </button>
            )
          })}
        </div>

        {/* Wallet pill at bottom */}
        <div style={{ marginTop: 'auto', padding: 12, borderRadius: 'var(--r-lg)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 5 }}>
            Connected wallet
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {wallet.publicKey ? formatWallet(wallet.publicKey) : '—'}
            </p>
            {wallet.publicKey && (
              <a
                href={stellarExplorerUrl(wallet.publicKey)}
                target="_blank" rel="noreferrer"
                title="View on Stellar Explorer"
                style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'rgba(255,255,255,.5)', textDecoration: 'none', transition: 'background 150ms, color 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,.2)'; (e.currentTarget as HTMLElement).style.color = '#4ADE80' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.5)' }}
              >
                <Globe size={11} strokeWidth={2} />
              </a>
            )}
          </div>
          <button
            onClick={copyAddress}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 700, color: copied ? 'var(--green-soft)' : 'rgba(255,255,255,.45)', background: copied ? 'rgba(34,197,94,.12)' : 'rgba(255,255,255,.06)', border: 'none', width: '100%', marginBottom: 6, transition: 'color 200ms, background 200ms' }}
          >
            {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
            {copied ? 'Copied!' : 'Copy address'}
          </button>
          <button
            onClick={wallet.disconnect}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.45)', background: 'rgba(255,255,255,.06)', border: 'none', width: '100%' }}
          >
            <LogOut size={12} strokeWidth={2} /> Disconnect
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '36px 32px', overflowY: 'auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 className="heading" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>Your financial reputation at a glance.</p>
          </div>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
              <RefreshCw size={13} strokeWidth={2} style={{ animation: 'spin 1.2s linear infinite' }} />
              Fetching on-chain score…
            </div>
          )}
        </div>

        {/* ── SCORE + FACTORS row ─────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, marginBottom: 20 }}>

          {/* Score card */}
          <div className="panel-card" style={{ padding: '28px 24px' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,.38)', marginBottom: 12, position: 'relative' }}>
              On-Chain Credit Score
            </p>

            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)' }} />
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)' }}>Loading from Stellar…</p>
              </div>
            ) : (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <div className="score-num" style={{ fontSize: 76, color: '#fff', lineHeight: 1, marginBottom: 10 }}>
                  {score}
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 'var(--r-full)', background: tier.color, color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  {tier.label}
                </span>
              </div>
            )}

            <div className="progress-track" style={{ marginBottom: 5 }}>
              <div
                className="progress-fill"
                style={{ width: isLoading ? '0%' : `${pct}%`, background: `linear-gradient(90deg, ${tier.color}, #4ADE80)` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,.28)', fontWeight: 700, marginBottom: 18 }}>
              <span>300</span><span>850</span>
            </div>

            <button
              onClick={() => nav('/score')}
              className="btn btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 700, color: 'var(--green-soft)', background: 'rgba(34,197,94,.1)', border: 'none', justifyContent: 'space-between' }}
            >
              <span>View score details</span>
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Score factors */}
          <div className="card" style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)' }}>Score Breakdown</h3>
              {!isLoading && (
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Live · Stellar testnet</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'Repayment History', weight: '40%', score: record?.repayment_score ?? 0, color: 'var(--green-soft)', hint: 'Repay loans on time' },
                { label: 'Transactions',      weight: '25%', score: record?.tx_score ?? 0,         color: '#60A5FA',           hint: 'Stay active on Stellar' },
                { label: 'Community Trust',   weight: '20%', score: record?.vouch_score ?? 0,      color: '#FBBF24',           hint: 'Get vouched by peers' },
                { label: 'Remittance',        weight: '15%', score: record?.anchor_score ?? 0,     color: '#A78BFA',           hint: 'Link GCash or remittance' },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{f.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)', background: 'var(--surface-3)', padding: '1px 7px', borderRadius: 'var(--r-full)' }}>{f.weight}</span>
                    </div>
                    <span className="score-num" style={{ fontSize: 15, color: 'var(--ink-2)' }}>
                      {isLoading ? '—' : f.score}
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>/100</span>
                    </span>
                  </div>
                  <div className="progress-track">
                    {isLoading
                      ? <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: 'var(--r-full)' }} />
                      : <div className="progress-fill" style={{ width: `${f.score}%`, background: f.color }} />
                    }
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{f.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DATA ROW (replaces 4-column identical cards) ─── */}
        <div className="card" style={{ display: 'flex', marginBottom: 20 }}>
          {[
            { label: 'Loan Limit',     value: isLoading ? '—' : formatPeso(tier.max),                color: 'var(--green)',   sub: 'Based on your score' },
            { label: 'Total Loans',    value: isLoading ? '—' : String(record?.total_loans ?? 0),    color: 'var(--ink)',     sub: 'Lifetime on-chain' },
            { label: 'Loans Repaid',   value: isLoading ? '—' : String(record?.loans_repaid ?? 0),   color: 'var(--ink)',     sub: 'On-time repayments' },
            { label: 'Vouches Received',value: '0',                                                   color: 'var(--amber)',   sub: 'Get vouched to boost score' },
          ].map((s, i) => (
            <div key={s.label} style={{
              flex: 1, padding: '22px 24px',
              borderRight: i < 3 ? '1px solid var(--border-2)' : 'none',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>{s.label}</p>
              <p className="score-num" style={{ fontSize: 30, color: s.color, marginBottom: 4 }}>
                {isLoading ? <span className="skeleton" style={{ display: 'inline-block', width: 60, height: 30 }} /> : s.value}
              </p>
              <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── ACTION LIST (replaces 3-column identical CTA cards) */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border-2)', marginBottom: 0 }}>
            <h3 className="heading" style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 16 }}>Quick actions</h3>
          </div>
          {[
            { Icon: CreditCard, title: 'Apply for a Loan',    desc: `Borrow up to ${formatPeso(tier.max)} at a flat 5% rate`, action: () => nav('/apply'),       accent: 'var(--green)', tint: 'var(--green-tint)' },
            { Icon: Users,      title: 'Vouch for Someone',   desc: 'Stake XLM to help a friend build their credit score',  action: () => nav('/vouch'),       accent: '#D97706',      tint: 'var(--amber-tint)' },
            { Icon: FileText,   title: 'Track My Loans',      desc: 'View repayment schedule and full loan history',         action: () => nav('/loans'),       accent: '#3B82F6',      tint: '#EFF6FF' },
            { Icon: Award,      title: 'Credit Certificate',  desc: 'Download proof of good credit to show lenders & banks', action: () => nav('/certificate'), accent: '#7C3AED',      tint: '#F5F3FF' },
          ].map((c, i) => {
            const Icon = c.Icon
            return (
              <button
                key={c.title}
                onClick={c.action}
                className="btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 18,
                  width: '100%', padding: '18px 24px', border: 'none',
                  background: 'transparent', textAlign: 'left', cursor: 'pointer',
                  borderBottom: i < 2 ? '1px solid var(--border-2)' : 'none',
                  borderRadius: 0,
                  transition: 'background 150ms var(--ease-out)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--r-lg)',
                  background: c.tint, display: 'grid', placeItems: 'center',
                  color: c.accent, flexShrink: 0,
                }}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{c.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{c.desc}</p>
                </div>
                <ArrowRight size={16} strokeWidth={2} color="var(--ink-4)" />
              </button>
            )
          })}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

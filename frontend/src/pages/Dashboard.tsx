import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, BarChart2, CreditCard, FileText, Users, LogOut,
  ArrowRight, ChevronRight, RefreshCw, Copy, Check, Globe, Award, TrendingUp, MessageSquare,
} from 'lucide-react'
import { stellarExplorerUrl } from '../lib/stellar'
import { scoreTier, scorePercent, formatWallet, formatPeso } from '../lib/stellar'
import { useScore } from '../hooks/useScore'
import GuestBanner from '../components/GuestBanner'
import FeedbackModal from '../components/FeedbackModal'
import { DEMO_SCORE_RECORD } from '../lib/demoData'
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
  const { record: liveRecord, isLoading } = useScore(wallet.isGuest ? null : wallet.publicKey)
  const record = wallet.isGuest ? DEMO_SCORE_RECORD : liveRecord
  const [copied, setCopied] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  function copyAddress() {
    if (!wallet.publicKey || wallet.isGuest) return
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
    <div className="app-layout" style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--surface-2)', fontFamily: 'var(--font)' }}>
      {showFeedback && <FeedbackModal walletAddress={wallet.publicKey} isGuest={wallet.isGuest} onClose={() => setShowFeedback(false)} />}

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="app-sidebar" style={{
        width: 232, flexShrink: 0,
        background: 'var(--panel)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 14px',
        position: 'sticky', top: 0, height: '100dvh',
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 10px', marginBottom: 28 }}>
          <img src="/bankero-logo.png" alt="Bankero" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'contain' }} />
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
          {wallet.isGuest ? (
            <>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 5 }}>
                Demo Mode
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 10, lineHeight: 1.5 }}>
                Viewing as guest. Connect a wallet to use real features.
              </p>
              <button
                onClick={() => wallet.disconnect()}
                className="btn btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--green)', border: 'none', width: '100%' }}
              >
                <LogOut size={12} strokeWidth={2} /> Connect Real Wallet
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main className="app-main" style={{ flex: 1, overflowY: 'auto' }}>
        {wallet.isGuest && <GuestBanner />}

        <div style={{ padding: '36px 32px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 className="heading" style={{ fontSize: 26, color: 'var(--ink)', marginBottom: 4 }}>
              {wallet.isGuest ? 'Demo Mode' : 'Welcome back'}
            </h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 15 }}>
              {wallet.isGuest ? 'Ito ang magiging dashboard mo kapag nag-connect ng wallet.' : 'Your financial reputation at a glance.'}
            </p>
          </div>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-4)', marginTop: 4 }}>
              <RefreshCw size={13} strokeWidth={2} style={{ animation: 'spin 1.2s linear infinite' }} />
              Fetching on-chain score…
            </div>
          )}
        </div>

        {/* ── SCORE + FACTORS row ─────────────────────────── */}
        <div className="score-factors-row" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, marginBottom: 20 }}>

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
        <div className="card data-strip" style={{ display: 'flex', marginBottom: 20 }}>
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

        {/* ── ACTION GROUPS ── */}
        {([
          {
            group: 'Borrowing',
            color: '#16A34A',
            items: [
              { Icon: CreditCard, title: 'Apply for a Loan',   desc: `Borrow up to ${formatPeso(tier.max)} at a flat 5% rate`,  action: () => nav('/apply'),       accent: '#16A34A', tint: 'var(--green-tint)' },
              { Icon: FileText,   title: 'Track My Loans',     desc: 'View repayment schedule and full loan history',            action: () => nav('/loans'),       accent: '#3B82F6', tint: '#EFF6FF' },
              { Icon: Award,      title: 'Credit Certificate', desc: 'Download proof of good credit to show lenders & banks',   action: () => nav('/certificate'), accent: '#7C3AED', tint: '#F5F3FF' },
            ],
          },
          {
            group: 'Build Your Score',
            color: '#F59E0B',
            items: [
              { Icon: FileText,   title: 'Bill Payment Proof', desc: 'Verify electricity, water, or internet bill payments',    action: () => nav('/pop/history'), accent: '#16A34A', tint: 'rgba(22,163,74,.1)' },
              { Icon: TrendingUp, title: 'XLM Savings Streak', desc: 'Deposit 1 XLM/week to earn bonus score points',          action: () => nav('/savings'),     accent: '#F59E0B', tint: 'rgba(245,158,11,.1)' },
            ],
          },
          {
            group: 'Community',
            color: '#7C3AED',
            items: [
              { Icon: Users, title: 'Vouch for Someone',    desc: 'Stake XLM to help a friend build their credit score',       action: () => nav('/vouch'),      accent: '#D97706', tint: 'var(--amber-tint)' },
              { Icon: Users, title: 'Community Paluwagan',  desc: 'Join a rotating savings group to boost your score',         action: () => nav('/paluwagan'),  accent: '#7C3AED', tint: 'rgba(124,58,237,.1)' },
            ],
          },
        ] as const).map(section => (
          <div key={section.group} className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
            {/* Section header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: section.color }} />
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: 0 }}>
                {section.group}
              </p>
            </div>
            {section.items.map((c, i) => {
              const Icon = c.Icon
              return (
                <button
                  key={c.title}
                  onClick={c.action}
                  className="btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    width: '100%', padding: '16px 20px', border: 'none',
                    background: 'transparent', textAlign: 'left', cursor: 'pointer',
                    borderBottom: i < section.items.length - 1 ? '1px solid var(--border-2)' : 'none',
                    borderRadius: 0, transition: 'background 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-lg)', background: c.tint, display: 'grid', placeItems: 'center', color: c.accent, flexShrink: 0 }}>
                    <Icon size={17} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{c.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{c.desc}</p>
                  </div>
                  <ArrowRight size={15} strokeWidth={2} color="var(--ink-4)" />
                </button>
              )
            })}
          </div>
        ))}

        {/* Feedback floating button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 999,
              background: 'var(--panel)', border: '1px solid rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.6)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(0,0,0,.2)',
            }}
          >
            <MessageSquare size={14} /> Leave Feedback
          </button>
        </div>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        {NAV.map(n => {
          const Icon = n.icon
          const active = path === n.path
          return (
            <button key={n.path} onClick={() => nav(n.path)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', color: active ? 'var(--green)' : 'rgba(255,255,255,.4)', fontSize: 9, fontWeight: 700 }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {n.label}
            </button>
          )
        })}
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}

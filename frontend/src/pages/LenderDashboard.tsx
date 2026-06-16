import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Users, CreditCard, BarChart2, Settings,
  LogOut, Check, X, Banknote, TrendingUp, AlertCircle,
  Clock, Save, RefreshCw,
} from 'lucide-react'
import { formatPeso, formatWallet } from '../lib/stellar'
import { getLoans, updateLoanStatus, type LocalLoan } from '../lib/loanStore'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const PAGES = [
  { id: 'Dashboard', Icon: Home },
  { id: 'Loans',     Icon: CreditCard },
  { id: 'Reports',   Icon: BarChart2 },
  { id: 'Settings',  Icon: Settings },
]


function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    Pending:   { color: '#D97706', bg: '#FEF3C7' },
    Approved:  { color: '#3B82F6', bg: '#EFF6FF' },
    Disbursed: { color: '#15803D', bg: '#F0FDF4' },
    Repaid:    { color: '#6B7280', bg: '#F1F5F9' },
    Defaulted: { color: '#DC2626', bg: '#FEF2F2' },
    Rejected:  { color: '#6B7280', bg: '#F1F5F9' },
  }
  const c = cfg[status] ?? cfg.Pending
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: c.bg, color: c.color }}>{status}</span>
  )
}

export default function LenderDashboard({ wallet: _ }: { wallet: WalletHook }) {
  const nav  = useNavigate()
  const [page, setPage] = useState('Dashboard')
  const [loans, setLoans] = useState<LocalLoan[]>([])

  function refresh() {
    setLoans(getLoans())
  }

  useEffect(() => { refresh() }, [])

  function approve(id: string) {
    updateLoanStatus(id, 'Approved')
    refresh()
  }

  function reject(id: string) {
    updateLoanStatus(id, 'Rejected')
    refresh()
  }

  function disburse(id: string) {
    updateLoanStatus(id, 'Disbursed')
    refresh()
  }

  const pending   = loans.filter(l => l.status === 'Pending')
  const approved  = loans.filter(l => l.status === 'Approved')
  const active    = loans.filter(l => l.status === 'Disbursed')
  const repaid    = loans.filter(l => l.status === 'Repaid')
  const defaulted = loans.filter(l => l.status === 'Defaulted')

  const totalDisbursed = [...active, ...repaid, ...defaulted].reduce((s, l) => s + l.amount, 0)
  const defaultRate    = [...repaid, ...defaulted].length > 0
    ? Math.round((defaulted.length / (repaid.length + defaulted.length)) * 100)
    : 0

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)' }}>

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside style={{ width: 220, background: 'var(--panel)', display: 'flex', flexDirection: 'column', padding: '24px 14px', flexShrink: 0, position: 'sticky', top: 0, height: '100dvh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.08)', display: 'grid', placeItems: 'center' }}>
            <span style={{ color: 'var(--panel-hi)', fontWeight: 900, fontSize: 13 }}>₱</span>
          </div>
          <span className="heading" style={{ fontSize: 16, color: '#fff' }}>Bank<span style={{ color: 'var(--panel-hi)' }}>e</span>ro</span>
        </div>
        <div style={{ padding: '4px 8px 20px' }}>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(34,197,94,.2)', color: '#4ADE80', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>Lender</span>
        </div>

        {PAGES.map(({ id, Icon }) => (
          <button key={id} onClick={() => setPage(id)} className={`sidenav-btn${page === id ? ' active' : ''}`}>
            <Icon size={16} strokeWidth={2} /> {id}
          </button>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <button onClick={() => nav('/login')} className="sidenav-btn">
            <LogOut size={14} strokeWidth={2} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>

        {/* ── DASHBOARD ──────────────────────────────────── */}
        {page === 'Dashboard' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}>Lender Dashboard</h1>
                <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Manage loan applications and your portfolio.</p>
              </div>
              <button onClick={refresh} className="btn btn-ghost btn-sm">
                <RefreshCw size={13} strokeWidth={2} /> Refresh
              </button>
            </div>

            {/* Stats row */}
            <div className="card" style={{ display: 'flex', marginBottom: 20 }}>
              {[
                { label: 'Pending',        value: String(pending.length),   color: '#D97706', Icon: Clock },
                { label: 'Active Loans',   value: String(active.length),    color: 'var(--green)', Icon: CreditCard },
                { label: 'Total Disbursed',value: formatPeso(totalDisbursed), color: '#3B82F6', Icon: Banknote },
                { label: 'Default Rate',   value: `${defaultRate}%`,         color: defaultRate > 10 ? '#DC2626' : 'var(--ink)', Icon: AlertCircle },
              ].map((s, i) => {
                const Icon = s.Icon
                return (
                  <div key={s.label} style={{ flex: 1, padding: '18px 22px', borderRight: i < 3 ? '1px solid var(--border-2)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>{s.label}</p>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + '12', display: 'grid', placeItems: 'center', color: s.color }}>
                        <Icon size={13} strokeWidth={2} />
                      </div>
                    </div>
                    <p className="score-num" style={{ fontSize: 26, color: s.color }}>{s.value}</p>
                  </div>
                )
              })}
            </div>

            {/* Pending applications */}
            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)' }}>Pending Applications</h3>
                {pending.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#FEF3C7', color: '#D97706' }}>{pending.length} waiting</span>
                )}
              </div>
              {pending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                    <CreditCard size={22} strokeWidth={1.5} color="var(--ink-4)" />
                  </div>
                  <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No pending applications right now</p>
                </div>
              ) : pending.map((loan, i) => (
                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < pending.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Users size={16} strokeWidth={2} color="var(--ink-4)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{formatWallet(loan.wallet)}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{loan.purpose} · {loan.term} days · Applied {new Date(loan.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginRight: 8 }}>{formatPeso(loan.amount)}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approve(loan.id)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
                      <Check size={13} strokeWidth={2.5} /> Approve
                    </button>
                    <button onClick={() => reject(loan.id)} className="btn btn-sm" style={{ borderRadius: 'var(--r-md)', background: '#FEF2F2', color: '#DC2626', border: 'none' }}>
                      <X size={13} strokeWidth={2.5} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Approved — waiting for disbursement */}
            {approved.length > 0 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 className="heading" style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 16 }}>Approved — Disburse Now</h3>
                {approved.map((loan, i) => (
                  <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < approved.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Users size={16} strokeWidth={2} color="#3B82F6" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{formatWallet(loan.wallet)}</p>
                      <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{loan.purpose} · {loan.term} days</p>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginRight: 8 }}>{formatPeso(loan.amount)}</p>
                    <button onClick={() => disburse(loan.id)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
                      <Banknote size={13} strokeWidth={2} /> Disburse XLM
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LOANS ─────────────────────────────────────── */}
        {page === 'Loans' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)' }}>All Loans</h1>
              <button onClick={refresh} className="btn btn-ghost btn-sm">
                <RefreshCw size={13} strokeWidth={2} /> Refresh
              </button>
            </div>
            <div className="card" style={{ padding: 24 }}>
              {loans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No loans in the system yet</p>
                </div>
              ) : loans.map((loan, i) => (
                <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < loans.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Users size={16} strokeWidth={2} color="var(--ink-4)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{formatWallet(loan.wallet)}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{loan.purpose} · {loan.term} days</p>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{formatPeso(loan.amount)}</p>
                  <StatusPill status={loan.status} />
                  {loan.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => approve(loan.id)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
                        <Check size={12} strokeWidth={2.5} /> Approve
                      </button>
                      <button onClick={() => reject(loan.id)} className="btn btn-sm" style={{ borderRadius: 'var(--r-md)', background: '#FEF2F2', color: '#DC2626', border: 'none' }}>
                        <X size={12} strokeWidth={2.5} /> Reject
                      </button>
                    </div>
                  )}
                  {loan.status === 'Approved' && (
                    <button onClick={() => disburse(loan.id)} className="btn btn-sm btn-primary" style={{ borderRadius: 'var(--r-md)' }}>
                      <Banknote size={12} strokeWidth={2} /> Disburse
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────────── */}
        {page === 'Reports' && (
          <div>
            <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 24 }}>Reports</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Portfolio Value',    value: formatPeso(totalDisbursed), Icon: Banknote,   color: 'var(--green)' },
                { label: 'Repayment Rate',     value: repaid.length + defaulted.length > 0 ? `${Math.round((repaid.length / (repaid.length + defaulted.length)) * 100)}%` : '—', Icon: TrendingUp, color: '#3B82F6' },
                { label: 'Default Rate',       value: `${defaultRate}%`,          Icon: AlertCircle, color: defaultRate > 10 ? '#DC2626' : 'var(--ink)' },
                { label: 'Total Borrowers',    value: String(new Set(loans.map(l => l.wallet)).size), Icon: Users, color: 'var(--ink)' },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '12', display: 'grid', placeItems: 'center', color }}>
                      <Icon size={15} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{label}</span>
                  </div>
                  <p className="score-num" style={{ fontSize: 32, color: 'var(--ink)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────── */}
        {page === 'Settings' && (
          <div>
            <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 24 }}>Settings</h1>
            <div className="card" style={{ padding: 28, maxWidth: 480 }}>
              {[
                { label: 'Max Loan Amount (₱)', value: '10000', type: 'number' },
                { label: 'Interest Rate (%)',    value: '5',     type: 'number' },
                { label: 'Min Credit Score',     value: '300',   type: 'number' },
              ].map(({ label, value, type }) => (
                <div key={label} style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input defaultValue={value} type={type} className="input" />
                </div>
              ))}
              <button className="btn btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14, marginTop: 4, borderRadius: 'var(--r-lg)' }}>
                <Save size={15} strokeWidth={2} /> Save Settings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

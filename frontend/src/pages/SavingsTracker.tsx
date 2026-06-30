import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, TrendingUp, Zap, RefreshCw, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEMO_SAVINGS_STREAK, DEMO_WEEKLY_DEPOSITS } from '../lib/demoData'
import {
  getSavingsStreak, getWeeklyDeposits, updateSavingsStreak, getCurrentWeekIdentifier,
} from '../services/savingsTracker'
import type { SavingsStreak, WeeklyDeposit } from '../types/savings'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

function WeekGrid({ deposits }: { deposits: WeeklyDeposit[] }) {
  const currentWeek = getCurrentWeekIdentifier()
  const depositedWeeks = new Set(deposits.map(d => d.week_identifier))

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const now = new Date()
    const d = new Date(now)
    d.setUTCDate(now.getUTCDate() - (7 * (7 - i)))
    return getCurrentWeekIdentifier(d)
  })

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {weeks.map(w => {
        const isCurrent = w === currentWeek
        const hasDeposit = depositedWeeks.has(w)
        return (
          <div
            key={w}
            title={w}
            style={{
              flex: 1, height: 36, borderRadius: 8,
              background: hasDeposit ? '#16A34A' : isCurrent ? 'rgba(245,158,11,.12)' : '#E9EEF0',
              border: `1.5px solid ${hasDeposit ? '#16A34A' : isCurrent ? 'rgba(245,158,11,.4)' : '#D4DCE0'}`,
              transition: 'background 200ms',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {hasDeposit && <CheckCircle size={14} color="#fff" strokeWidth={2.5} />}
          </div>
        )
      })}
    </div>
  )
}

export default function SavingsTrackerPage({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [streak, setStreak] = useState<SavingsStreak | null>(null)
  const [deposits, setDeposits] = useState<WeeklyDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (wallet.isGuest) {
      setStreak(DEMO_SAVINGS_STREAK as unknown as SavingsStreak)
      setDeposits(DEMO_WEEKLY_DEPOSITS as unknown as WeeklyDeposit[])
      setLoading(false)
      return
    }
    if (!wallet.publicKey) return
    async function load() {
      const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet.publicKey!).maybeSingle()
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const [streakData, depositsData] = await Promise.all([
        getSavingsStreak(user.id),
        getWeeklyDeposits(user.id, 8),
      ])
      setStreak(streakData)
      setDeposits(depositsData)
      setLoading(false)
    }
    load()
  }, [wallet.publicKey, wallet.isGuest])

  async function checkDeposit() {
    if (wallet.isGuest) return
    if (!userId || !wallet.publicKey) return
    setRefreshing(true)
    try {
      const updated = await updateSavingsStreak(userId, wallet.publicKey)
      setStreak(updated)
      setDeposits(await getWeeklyDeposits(userId, 8))
    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }

  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0
  const totalBonus = streak?.total_bonus_earned ?? 0
  const weeksToNextBonus = 4 - (current % 4)
  const canEarnMoreBonus = totalBonus < 30

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>XLM Savings Streak</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Deposit at least 1 XLM every week to grow your credit score.
        </p>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Main streak card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: current > 0 ? 'rgba(245,158,11,.1)' : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${current > 0 ? 'rgba(245,158,11,.3)' : '#E2E8F0'}`,
                  }}>
                    <Flame size={22} color={current > 0 ? '#F59E0B' : '#94A3B8'} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 2 }}>Current Streak</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{current}</span>
                      <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>week{current !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>

              {canEarnMoreBonus && (
                <>
                  <div style={{ height: 8, borderRadius: 999, background: '#E9EEF0', marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999, background: '#F59E0B',
                      width: `${((4 - weeksToNextBonus) / 4) * 100}%`, transition: 'width 600ms',
                    }} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                    {weeksToNextBonus === 4 && current === 0
                      ? 'Deposit 1 XLM to start your streak'
                      : <>{weeksToNextBonus} more week{weeksToNextBonus !== 1 ? 's' : ''} to earn <span style={{ color: '#F59E0B', fontWeight: 700 }}>+10 tx_score bonus</span></>
                    }
                  </div>
                </>
              )}
              {!canEarnMoreBonus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={16} color="#16A34A" strokeWidth={2} />
                  <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 600 }}>Maximum bonus earned — +30 tx_score</span>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Longest Streak</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={20} color="#16A34A" strokeWidth={2} />
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>{longest}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>wks</span>
                </div>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Score Bonus</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={20} color="#F59E0B" strokeWidth={2} />
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>+{totalBonus}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>/ 30</span>
                </div>
              </div>
            </div>

            {/* Week grid */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Last 8 Weeks</div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: '#16A34A', display: 'inline-block' }} /> Deposited
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(245,158,11,.12)', border: '1.5px solid rgba(245,158,11,.4)', display: 'inline-block' }} /> This week
                  </span>
                </div>
              </div>
              <WeekGrid deposits={deposits} />
            </div>

            {/* CTA */}
            <button
              onClick={checkDeposit}
              disabled={refreshing}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: refreshing ? 0.65 : 1,
              }}
            >
              <RefreshCw size={15} strokeWidth={2} style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}} />
              {refreshing ? 'Checking...' : 'Check My Deposit'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>
              Minimum deposit is 1 XLM per week.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

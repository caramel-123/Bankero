import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, TrendingUp, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEMO_SAVINGS_STREAK, DEMO_WEEKLY_DEPOSITS } from '../lib/demoData'
import {
  getSavingsStreak, getWeeklyDeposits, updateSavingsStreak, getCurrentWeekIdentifier,
} from '../services/savingsTracker'
import type { SavingsStreak, WeeklyDeposit } from '../types/savings'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const panel = { background: 'var(--panel)', borderRadius: 'var(--r-lg)', padding: 24 }

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
    <div style={{ display: 'flex', gap: 6 }}>
      {weeks.map(w => {
        const isCurrent = w === currentWeek
        const hasDeposit = depositedWeeks.has(w)
        return (
          <div
            key={w}
            title={w}
            style={{
              flex: 1, height: 32, borderRadius: 6,
              background: hasDeposit ? '#16A34A' : isCurrent ? 'rgba(245,158,11,.2)' : 'rgba(255,255,255,.07)',
              border: isCurrent ? '1px solid rgba(245,158,11,.4)' : '1px solid transparent',
              transition: 'background 200ms',
            }}
          />
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
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> Bumalik
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>XLM Savings Streak</h1>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, marginBottom: 24 }}>
          Mag-deposit ng kahit 1 XLM bawat linggo para mapalaki ang iyong credit score.
        </p>

        {loading ? (
          <div style={{ ...panel, textAlign: 'center', color: 'rgba(255,255,255,.35)' }}>Naglo-load...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Main streak card */}
            <div style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: current > 0 ? 'rgba(245,158,11,.15)' : 'rgba(255,255,255,.05)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: current > 0 ? '2px solid rgba(245,158,11,.3)' : '2px solid rgba(255,255,255,.08)',
                }}>
                  <Flame size={28} color={current > 0 ? '#F59E0B' : 'rgba(255,255,255,.2)'} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: current > 0 ? '#F59E0B' : 'rgba(255,255,255,.2)', marginTop: 2 }}>streak</span>
                </div>
                <div>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{current}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                    {current === 1 ? 'linggo' : 'linggo'} na sunod-sunod
                  </div>
                </div>
              </div>

              {canEarnMoreBonus && (
                <>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 999, background: '#F59E0B', width: `${((4 - weeksToNextBonus) / 4) * 100}%`, transition: 'width 600ms' }} />
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
                    {weeksToNextBonus === 4 && current === 0
                      ? 'Mag-deposit ng 1 XLM para simulan ang streak'
                      : <>{weeksToNextBonus} {weeksToNextBonus === 1 ? 'linggo' : 'linggo'} pa para sa <span style={{ color: '#F59E0B', fontWeight: 700 }}>+10 tx_score bonus</span></>
                    }
                  </div>
                </>
              )}
              {!canEarnMoreBonus && (
                <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>Maximum bonus na-earn! +30 tx_score 🎉</div>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ ...panel, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>Pinakamahaba</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={18} color="#16A34A" />
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{longest}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>weeks</span>
                </div>
              </div>
              <div style={{ ...panel, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>Score Bonus</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={18} color="#F59E0B" />
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>+{totalBonus}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>/ 30</span>
                </div>
              </div>
            </div>

            {/* Week grid */}
            <div style={panel}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>Nakaraang 8 Linggo</div>
              <WeekGrid deposits={deposits} />
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: '#16A34A', display: 'inline-block' }} /> May deposit
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(245,158,11,.2)', border: '1px solid rgba(245,158,11,.4)', display: 'inline-block' }} /> Kasalukuyang linggo
                </span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={checkDeposit}
              disabled={refreshing}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer',
                background: refreshing ? 'rgba(22,163,74,.3)' : '#16A34A',
                color: '#fff', fontWeight: 700, fontSize: 15, minHeight: 48,
              }}
            >
              {refreshing ? 'Sinisigurado...' : '🔄 I-check ang Deposit Ko'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.3)', marginTop: -4 }}>
              Kahit 1 XLM lang ang minimum deposit bawat linggo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

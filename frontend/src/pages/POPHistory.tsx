import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Clock, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEMO_POP_SUBMISSIONS, DEMO_POP_STREAK } from '../lib/demoData'
import type { POPSubmission, POPStreak } from '../types/pop'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const panel = { background: 'var(--panel)', borderRadius: 'var(--r-lg)', padding: 24 }

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    passed:  { bg: 'rgba(22,163,74,.15)',   color: '#4ade80', label: 'Pumasa',   Icon: CheckCircle },
    failed:  { bg: 'rgba(239,68,68,.15)',   color: '#f87171', label: 'Hindi Pumasa', Icon: XCircle },
    pending: { bg: 'rgba(245,158,11,.15)',  color: '#fbbf24', label: 'Pending',  Icon: Clock },
  }[status] ?? { bg: 'rgba(255,255,255,.08)', color: '#fff', label: status, Icon: Clock }
  const { bg, color, label, Icon } = cfg
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: bg, color, fontSize: 12, fontWeight: 600 }}>
      <Icon size={11} /> {label}
    </span>
  )
}

function StreakCalendar({ submissions }: { submissions: POPSubmission[] }) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  })
  const verified = new Set(submissions.filter(s => s.validation_status === 'passed').map(s => s.billing_period))
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {months.map(m => {
        const ok = verified.has(m)
        return (
          <div key={m} style={{
            flex: 1, minWidth: 44, padding: '8px 4px', borderRadius: 8, textAlign: 'center',
            background: ok ? 'rgba(22,163,74,.15)' : 'rgba(255,255,255,.05)',
            border: `1px solid ${ok ? 'rgba(22,163,74,.3)' : 'rgba(255,255,255,.08)'}`,
          }}>
            <div style={{ fontSize: 11, color: ok ? '#4ade80' : 'rgba(255,255,255,.3)', fontWeight: 600 }}>{m.slice(0,2)}/{m.slice(5,7)}</div>
            <div style={{ fontSize: 16, marginTop: 2 }}>{ok ? '✅' : '·'}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function POPHistory({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [submissions, setSubmissions] = useState<POPSubmission[]>([])
  const [streak, setStreak] = useState<POPStreak | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (wallet.isGuest) {
      setSubmissions(DEMO_POP_SUBMISSIONS as unknown as POPSubmission[])
      setStreak(DEMO_POP_STREAK as unknown as POPStreak)
      setLoading(false)
      return
    }
    if (!wallet.publicKey) return
    async function load() {
      const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet.publicKey!).maybeSingle()
      if (!user) { setLoading(false); return }
      const [{ data: subs }, { data: streakData }] = await Promise.all([
        supabase.from('pop_submissions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('pop_streaks').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      setSubmissions((subs ?? []) as POPSubmission[])
      setStreak((streakData ?? null) as POPStreak | null)
      setLoading(false)
    }
    load()
  }, [wallet.publicKey, wallet.isGuest])

  const consecutive = streak?.consecutive_months ?? 0
  const nextMilestone = consecutive < 3 ? 3 : consecutive < 6 ? 6 : consecutive < 12 ? 12 : null
  const nextBonus = nextMilestone === 3 ? 5 : nextMilestone === 6 ? 10 : nextMilestone === 12 ? 20 : 0

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> Bumalik
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Bill Payment History</h1>
          <button onClick={() => nav('/pop/submit')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Plus size={14} /> Mag-submit
          </button>
        </div>

        {/* Streak card */}
        <div style={{ ...panel, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>Consecutive Months</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: consecutive >= 3 ? '#4ade80' : '#fff', lineHeight: 1 }}>{consecutive}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>Total Score Bonus</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B' }}>+{streak?.total_score_bonus ?? 0}</div>
            </div>
          </div>

          {nextMilestone && (
            <>
              <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 999, background: '#16A34A', width: `${(consecutive / nextMilestone) * 100}%`, transition: 'width 600ms ease' }} />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
                {nextMilestone - consecutive} buwan pa para sa <span style={{ color: '#F59E0B', fontWeight: 700 }}>+{nextBonus} anchor score</span>
              </div>
            </>
          )}
          {!nextMilestone && <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>Maximum streak na-reach! 🎉</div>}
        </div>

        {/* Calendar */}
        {submissions.length > 0 && (
          <div style={{ ...panel, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>Nakaraang 6 Buwan</div>
            <StreakCalendar submissions={submissions} />
          </div>
        )}

        {/* Submission list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <div style={{ ...panel, color: 'rgba(255,255,255,.35)', textAlign: 'center' }}>Naglo-load...</div>}
          {!loading && submissions.length === 0 && (
            <div style={{ ...panel, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,.4)', marginBottom: 16 }}>Wala ka pang submission.</p>
              <button onClick={() => nav('/pop/submit')} style={{ padding: '12px 24px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Mag-submit ng Bill
              </button>
            </div>
          )}
          {submissions.map(s => (
            <div key={s.id} style={panel}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{s.biller_name}</div>
                <StatusBadge status={s.validation_status} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
                {s.billing_period} · ₱{s.amount_paid?.toLocaleString()}
                {s.score_applied && <span style={{ color: '#F59E0B', marginLeft: 8, fontWeight: 600 }}>Score applied</span>}
              </div>
              {s.validation_errors && s.validation_errors.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {(s.validation_errors as string[]).map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#fca5a5', marginTop: 4 }}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

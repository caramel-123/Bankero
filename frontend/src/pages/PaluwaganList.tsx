import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Clock, ChevronRight, Trophy, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { PaluwagaGroupView } from '../types/paluwagan'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    active:    { label: 'Aktibo',      bg: 'rgba(22,163,74,.15)',  color: '#16A34A' },
    completed: { label: 'Tapos Na',    bg: 'rgba(245,158,11,.15)', color: '#F59E0B' },
    defaulted: { label: 'Defaulted',   bg: 'rgba(220,38,38,.15)',  color: '#DC2626' },
  }[status] ?? { label: status, bg: 'var(--surface-3)', color: 'var(--ink-3)' }

  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, letterSpacing: '0.04em' }}>
      {cfg.label}
    </span>
  )
}

function GroupCard({ group, onClick }: { group: PaluwagaGroupView; onClick: () => void }) {
  const days = group.days_until_deadline
  const urgent = days !== null && days <= 2

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', background: 'var(--panel)',
        border: `1px solid ${urgent ? 'rgba(245,158,11,.4)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)', padding: '18px 20px',
        cursor: 'pointer', transition: 'all 150ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = urgent ? 'rgba(245,158,11,.4)' : 'var(--border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{group.group_name}</span>
            <StatusBadge status={group.status} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            {group.contribution_amount_xlm} XLM / {group.cycle_frequency === 'weekly' ? 'linggo' : 'buwan'}
            {' · '}{group.members.length} miyembro
          </p>
        </div>
        <ChevronRight size={16} color="var(--ink-4)" />
      </div>

      {/* Cycle progress bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            Cycle {group.current_cycle} ng {group.total_cycles}
          </span>
          {group.my_rotation_order === group.current_cycle && group.status === 'active' && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>
              🎉 Ikaw ang tatanggap ngayong cycle!
            </span>
          )}
        </div>
        <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${((group.current_cycle - 1) / group.total_cycles) * 100}%`,
            background: group.status === 'completed' ? '#F59E0B' : 'var(--green)',
            transition: 'width 400ms ease',
          }} />
        </div>
      </div>

      {/* Deadline + pot */}
      <div style={{ display: 'flex', gap: 16 }}>
        {days !== null && group.status === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {urgent ? <AlertTriangle size={13} color="#F59E0B" /> : <Clock size={13} color="var(--ink-4)" />}
            <span style={{ fontSize: 12, color: urgent ? '#F59E0B' : 'var(--ink-4)', fontWeight: urgent ? 700 : 400 }}>
              {days === 0 ? 'Ngayon na!' : `${days} araw na lang`}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Trophy size={13} color="var(--ink-4)" />
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            Pot: {group.pot_per_cycle} XLM
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Users size={13} color="var(--ink-4)" />
          <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            Ikaw: #{group.my_rotation_order}
          </span>
        </div>
      </div>
    </button>
  )
}

export default function PaluwaganList({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [groups, setGroups] = useState<PaluwagaGroupView[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wallet.publicKey) return

    async function load() {
      const { data: user } = await supabase
        .from('users').select('id').eq('wallet_address', wallet.publicKey!).maybeSingle()
      if (!user) { setLoading(false); return }

      const { data: memberships } = await supabase
        .from('paluwagan_members')
        .select('*, paluwagan_groups(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const views: PaluwagaGroupView[] = await Promise.all(
        (memberships ?? []).map(async (m: any) => {
          const g = m.paluwagan_groups
          const { data: allMembers } = await supabase
            .from('paluwagan_members')
            .select('*')
            .eq('group_id', g.id)

          const potPerCycle = g.contribution_amount_xlm * (allMembers?.length ?? 0)
          return {
            ...g,
            my_rotation_order: m.rotation_order,
            my_total_contributions: m.total_contributions,
            my_consecutive_misses: m.consecutive_misses,
            my_is_active: m.is_active,
            members: allMembers ?? [],
            pot_per_cycle: potPerCycle,
            days_until_deadline: daysUntil(g.next_deadline),
          }
        })
      )
      setGroups(views)
      setLoading(false)
    }
    load()
  }, [wallet.publicKey, wallet.isGuest])

  const active = groups.filter(g => g.status === 'active')
  const done = groups.filter(g => g.status !== 'active')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <button onClick={() => nav('/dashboard')} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 className="heading" style={{ fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}>
              Aking Paluwagan
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
              Rotating savings groups sa Stellar blockchain
            </p>
          </div>
          <button
            onClick={() => nav('/paluwagan/create')}
            className="btn btn-primary"
            style={{ borderRadius: 'var(--r-lg)', padding: '10px 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} /> Gumawa
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: 60 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-3)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
              <Users size={28} color="var(--ink-4)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Wala ka pang paluwagan</p>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>Sumali o gumawa ng bagong grupo para magsimula.</p>
            <button onClick={() => nav('/paluwagan/create')} className="btn btn-primary" style={{ borderRadius: 'var(--r-lg)', padding: '12px 24px' }}>
              <Plus size={15} /> Gumawa ng Paluwagan
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Aktibong Grupo ({active.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {active.map(g => (
                    <GroupCard key={g.id} group={g} onClick={() => nav(`/paluwagan/${g.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {done.length > 0 && (
              <section>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Nakaraang Grupo ({done.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {done.map(g => (
                    <GroupCard key={g.id} group={g} onClick={() => nav(`/paluwagan/${g.id}`)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div style={{ marginTop: 28, padding: '16px 20px', background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 'var(--r-lg)' }}>
          <p style={{ fontSize: 13, color: 'var(--green)', margin: 0, lineHeight: 1.6 }}>
            <strong>Paano nakakatulong ang Paluwagan sa iyong score?</strong><br />
            Bawat on-time na kontribusyon = +3 tx_score · Miss = −2 anchor_score · Tapos na cycle = +10 anchor_score
          </p>
        </div>

      </div>
    </div>
  )
}

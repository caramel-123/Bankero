import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, XCircle, Trophy, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEMO_PALUWAGAN_GROUPS, DEMO_PALUWAGAN_MEMBERS, DEMO_PALUWAGAN_CONTRIBUTIONS } from '../lib/demoData'
import type { PaluwagaGroup, PaluwagaMember, PaluwagaContribution, PaluwagaPotRelease } from '../types/paluwagan'
import { checkAndEnforceDeadlines } from '../services/paluwagaScoring'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

function useCountdown(deadline: string | null) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!deadline) return
    const tick = () => setSeconds(Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return { d, h, m, s, expired: seconds === 0 }
}

function CountdownBox({ deadline }: { deadline: string | null }) {
  const { d, h, m, s, expired } = useCountdown(deadline)
  if (!deadline) return null
  if (expired) return <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 700 }}>Deadline na nakaraan!</p>
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[{ v: d, label: 'araw' }, { v: h, label: 'oras' }, { v: m, label: 'min' }, { v: s, label: 'seg' }].map(({ v, label }) => (
        <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--surface-3)', borderRadius: 8, padding: '8px 4px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', fontFamily: 'monospace' }}>{String(v).padStart(2, '0')}</div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase' }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

export default function PaluwaganDetail({ wallet }: { wallet: WalletHook }) {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [group, setGroup] = useState<PaluwagaGroup | null>(null)
  const [members, setMembers] = useState<PaluwagaMember[]>([])
  const [contributions, setContributions] = useState<PaluwagaContribution[]>([])
  const [releases, setReleases] = useState<PaluwagaPotRelease[]>([])
  const [myMembership, setMyMembership] = useState<PaluwagaMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current')

  useEffect(() => {
    if (wallet.isGuest) {
      const g = (DEMO_PALUWAGAN_GROUPS as any[]).find(g => g.id === id) ?? DEMO_PALUWAGAN_GROUPS[0]
      setGroup(g as unknown as PaluwagaGroup)
      setMembers(DEMO_PALUWAGAN_MEMBERS as unknown as PaluwagaMember[])
      setContributions(DEMO_PALUWAGAN_CONTRIBUTIONS as unknown as PaluwagaContribution[])
      setMyMembership(DEMO_PALUWAGAN_MEMBERS[2] as unknown as PaluwagaMember)
      setLoading(false)
      return
    }
    if (!id) return

    async function load() {
      const { data: g } = await supabase.from('paluwagan_groups').select('*').eq('id', id).maybeSingle()
      if (!g) { setLoading(false); return }
      setGroup(g)

      const [{ data: mems }, { data: contribs }, { data: rels }] = await Promise.all([
        supabase.from('paluwagan_members').select('*').eq('group_id', id).order('rotation_order'),
        supabase.from('paluwagan_contributions').select('*').eq('group_id', id).order('cycle_number'),
        supabase.from('paluwagan_pot_releases').select('*').eq('group_id', id).order('cycle_number'),
      ])

      setMembers((mems ?? []) as PaluwagaMember[])
      setContributions((contribs ?? []) as PaluwagaContribution[])
      setReleases((rels ?? []) as PaluwagaPotRelease[])

      // Find current user's membership
      const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet.publicKey!).maybeSingle()
      if (user) {
        const mine = (mems ?? []).find((m: any) => m.user_id === user.id) as PaluwagaMember | undefined
        setMyMembership(mine ?? null)
      }

      // Enforce deadlines if past due
      if (g.status === 'active') await checkAndEnforceDeadlines(id!)
      setLoading(false)
    }
    load()
  }, [id, wallet.publicKey, wallet.isGuest])

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!group) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
      <p style={{ color: 'var(--ink-3)' }}>Hindi mahanap ang grupo.</p>
    </div>
  )

  const currentCycleContribs = contributions.filter(c => c.cycle_number === group.current_cycle)
  const contributedIds = new Set(currentCycleContribs.map(c => c.user_id))
  const myRotationOrder = myMembership?.rotation_order ?? null
  const iAmRecipientThisCycle = myRotationOrder === group.current_cycle
  const iHaveContributed = myMembership ? contributedIds.has(myMembership.user_id) : false
  const potPerCycle = group.contribution_amount_xlm * members.filter(m => m.is_active).length

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <button onClick={() => nav('/paluwagan')} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Bumalik
        </button>

        {/* Header */}
        <div style={{ background: 'var(--panel)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>{group.group_name}</h1>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
                {group.contribution_amount_xlm} XLM · {group.cycle_frequency === 'weekly' ? 'Lingguhán' : 'Buwanán'}
              </p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
              background: group.status === 'active' ? 'rgba(22,163,74,.15)' : group.status === 'completed' ? 'rgba(245,158,11,.15)' : 'rgba(220,38,38,.15)',
              color: group.status === 'active' ? '#16A34A' : group.status === 'completed' ? '#F59E0B' : '#DC2626',
            }}>
              {group.status === 'active' ? 'Aktibo' : group.status === 'completed' ? 'Tapos Na' : 'Defaulted'}
            </span>
          </div>

          {/* Cycle progress */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Cycle {group.current_cycle} ng {group.total_cycles}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>Pot: {potPerCycle} XLM</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${((group.current_cycle - 1) / group.total_cycles) * 100}%`,
                background: group.status === 'completed' ? '#F59E0B' : 'var(--green)',
              }} />
            </div>
          </div>

          {group.status === 'active' && (
            <>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', marginBottom: 8 }}>SUSUNOD NA DEADLINE</p>
              <CountdownBox deadline={group.next_deadline} />
            </>
          )}
        </div>

        {/* My status card */}
        {myMembership && group.status === 'active' && (
          <div style={{
            background: iAmRecipientThisCycle ? 'rgba(245,158,11,.1)' : 'var(--panel)',
            border: `1px solid ${iAmRecipientThisCycle ? 'rgba(245,158,11,.3)' : 'var(--border)'}`,
            borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 16,
          }}>
            {iAmRecipientThisCycle ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <Trophy size={24} color="#F59E0B" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>Ikaw ang makakatanggap ngayong cycle!</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
                    Makatatanggap ka ng {potPerCycle} XLM kapag nag-contribute na ang lahat ng miyembro.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 4px' }}>Ang iyong turn na tumanggap</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Cycle #{myRotationOrder}</p>
                </div>
                {iHaveContributed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                    <CheckCircle size={18} strokeWidth={2} /> Na-contribute na
                  </div>
                ) : (
                  <button
                    onClick={() => nav(`/paluwagan/${id}/contribute`)}
                    className="btn btn-primary"
                    style={{ borderRadius: 'var(--r-lg)', padding: '10px 20px', fontSize: 14 }}
                  >
                    Mag-ambag
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, background: 'var(--surface-3)', borderRadius: 'var(--r-lg)', padding: 4, marginBottom: 16 }}>
          {(['current', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: activeTab === tab ? 'var(--panel)' : 'transparent',
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink-4)',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}
            >
              {tab === 'current' ? 'Kasalukuyang Cycle' : 'Kasaysayan'}
            </button>
          ))}
        </div>

        {/* Members list — current cycle status */}
        {activeTab === 'current' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(m => {
              const contributed = contributedIds.has(m.user_id)
              const isRecipient = m.rotation_order === group.current_cycle
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: 'var(--panel)', borderRadius: 12,
                  border: `1px solid ${isRecipient ? 'rgba(245,158,11,.3)' : 'var(--border)'}`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: contributed ? 'rgba(22,163,74,.15)' : 'var(--surface-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {contributed
                      ? <CheckCircle size={18} color="var(--green)" strokeWidth={2} />
                      : m.is_active
                        ? <Clock size={16} color="var(--ink-4)" />
                        : <XCircle size={16} color="#DC2626" />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 2px' }}>
                      {m.display_name || `Miyembro #${m.rotation_order}`}
                      {isRecipient && <span style={{ marginLeft: 8, fontSize: 11, color: '#F59E0B', fontWeight: 700 }}>🏆 Tatanggap</span>}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0, fontFamily: 'monospace' }}>
                      {m.stellar_address.slice(0, 16)}…
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: contributed ? 'var(--green)' : m.is_active ? 'var(--ink-4)' : '#DC2626', fontWeight: 600, margin: 0 }}>
                      {contributed ? 'Na-ambag' : m.is_active ? 'Naghihintay' : 'Inalis'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0 }}>Turn: Cycle #{m.rotation_order}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {releases.length === 0 && contributions.length === 0 ? (
              <p style={{ color: 'var(--ink-4)', textAlign: 'center', padding: 32 }}>Wala pang nakaraang cycles.</p>
            ) : (
              releases.map(r => {
                const cycleContribs = contributions.filter(c => c.cycle_number === r.cycle_number)
                return (
                  <div key={r.id} style={{ background: 'var(--panel)', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Cycle {r.cycle_number}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>{r.total_amount_xlm} XLM</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: '0 0 8px' }}>
                      {cycleContribs.length}/{members.length} miyembro nag-ambag · {new Date(r.released_at).toLocaleDateString('en-PH')}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Trophy size={13} color="#F59E0B" />
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Natanggap ng Miyembro #{members.find(m => m.user_id === r.recipient_user_id)?.rotation_order ?? '?'}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {group.status === 'active' && !iHaveContributed && myMembership?.is_active && !iAmRecipientThisCycle && (
          <button
            onClick={() => nav(`/paluwagan/${id}/contribute`)}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 24, borderRadius: 'var(--r-lg)', padding: '16px 0', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Mag-ambag ngayon <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

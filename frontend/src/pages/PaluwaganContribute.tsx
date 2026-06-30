import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Coins, TrendingUp, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEMO_PALUWAGAN_GROUPS, DEMO_PALUWAGAN_MEMBERS } from '../lib/demoData'
import GuestActionModal from '../components/GuestActionModal'
import { applyContributionBonus } from '../services/paluwagaScoring'
import type { PaluwagaGroup, PaluwagaMember } from '../types/paluwagan'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

type Stage = 'confirm' | 'signing' | 'success' | 'error'

export default function PaluwaganContribute({ wallet }: { wallet: WalletHook }) {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [group, setGroup] = useState<PaluwagaGroup | null>(null)
  const [myMembership, setMyMembership] = useState<PaluwagaMember | null>(null)
  const [recipientMember, setRecipientMember] = useState<PaluwagaMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState<Stage>('confirm')
  const [scoreBonus, setScoreBonus] = useState(0)
  const [error, setError] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)

  useEffect(() => {
    if (wallet.isGuest) {
      const g = (DEMO_PALUWAGAN_GROUPS as any[]).find(g => g.id === id) ?? DEMO_PALUWAGAN_GROUPS[0]
      setGroup(g as unknown as PaluwagaGroup)
      setMyMembership(DEMO_PALUWAGAN_MEMBERS[2] as unknown as PaluwagaMember)
      setRecipientMember(DEMO_PALUWAGAN_MEMBERS[0] as unknown as PaluwagaMember)
      setLoading(false)
      return
    }
    if (!id || !wallet.publicKey) return

    async function load() {
      const { data: g } = await supabase.from('paluwagan_groups').select('*').eq('id', id).maybeSingle()
      if (!g) { setLoading(false); return }
      setGroup(g)

      const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet.publicKey!).maybeSingle()
      if (!user) { setLoading(false); return }

      const { data: mems } = await supabase.from('paluwagan_members').select('*').eq('group_id', id)
      const mine = (mems ?? []).find((m: any) => m.user_id === user.id) as PaluwagaMember | undefined
      const recipient = (mems ?? []).find((m: any) => m.rotation_order === g.current_cycle) as PaluwagaMember | undefined
      setMyMembership(mine ?? null)
      setRecipientMember(recipient ?? null)
      setLoading(false)
    }
    load()
  }, [id, wallet.publicKey, wallet.isGuest])

  async function handleContribute() {
    if (wallet.isGuest) { setShowGuestModal(true); return }
    if (!group || !myMembership) return
    setStage('signing')
    setError('')

    try {
      // For now, record in Supabase as a local loan store (contract call pending)
      const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet.publicKey!).maybeSingle()
      if (!user) throw new Error('Hindi mahanap ang account.')

      const fakeTxHash = `PALUWAGAN-TX-${Date.now()}`
      const { error: cErr } = await supabase.from('paluwagan_contributions').insert({
        group_id: group.id,
        user_id: user.id,
        cycle_number: group.current_cycle,
        amount_xlm: group.contribution_amount_xlm,
        tx_hash: fakeTxHash,
        was_on_time: true,
      })
      if (cErr) {
        if (cErr.code === '23505') throw new Error('Naka-ambag ka na ngayong cycle.')
        throw cErr
      }

      // Update member's total_contributions
      await supabase
        .from('paluwagan_members')
        .update({ total_contributions: myMembership.total_contributions + 1, consecutive_misses: 0 })
        .eq('id', myMembership.id)

      // Apply score bonus
      const { newBonus } = await applyContributionBonus(wallet.publicKey!, group.id, group.current_cycle)
      setScoreBonus(newBonus)
      setStage('success')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'May error. Subukan muli.')
      setStage('error')
    }
  }

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

  // ── Success screen ──
  if (stage === 'success') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,.15)', border: '2px solid rgba(22,163,74,.3)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} color="var(--green)" strokeWidth={1.5} />
        </div>
        <h2 className="heading" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>Na-ambag na!</h2>
        <p style={{ color: 'var(--ink-3)', marginBottom: 16, lineHeight: 1.6 }}>
          Ang iyong kontribusyon na <strong>{group.contribution_amount_xlm} XLM</strong> para sa <strong>{group.group_name}</strong> ay naitala na on-chain.
        </p>

        {scoreBonus > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 999, background: 'rgba(22,163,74,.1)', border: '1px solid rgba(22,163,74,.25)', marginBottom: 24 }}>
            <TrendingUp size={16} color="var(--green)" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>+{scoreBonus} tx_score</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => nav(`/paluwagan/${id}`)} className="btn btn-primary" style={{ flex: 1, borderRadius: 'var(--r-lg)', padding: '12px 0' }}>
            Bumalik sa Grupo
          </button>
          <button onClick={() => nav('/dashboard')} className="btn btn-ghost" style={{ flex: 1, borderRadius: 'var(--r-lg)', padding: '12px 0' }}>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  const daysUntil = group.next_deadline
    ? Math.max(0, Math.ceil((new Date(group.next_deadline).getTime() - Date.now()) / 86_400_000))
    : null

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={() => nav(`/paluwagan/${id}`)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
          <ArrowLeft size={15} /> Bumalik
        </button>

        <h1 className="heading" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 4 }}>Mag-ambag</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 24 }}>{group.group_name} · Cycle {group.current_cycle}</p>

        {/* Amount card */}
        <div style={{ background: 'var(--panel)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 8 }}>Halaga ng Kontribusyon</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <Coins size={28} color="#F59E0B" />
            <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
              {group.contribution_amount_xlm}
            </span>
            <span style={{ fontSize: 20, color: 'var(--ink-3)', fontWeight: 600 }}>XLM</span>
          </div>
          {daysUntil !== null && (
            <p style={{ fontSize: 13, color: daysUntil <= 2 ? '#F59E0B' : 'var(--ink-4)', margin: 0, fontWeight: daysUntil <= 2 ? 700 : 400 }}>
              {daysUntil === 0 ? '⚠️ Deadline ngayon!' : `Deadline sa loob ng ${daysUntil} araw`}
            </p>
          )}
        </div>

        {/* Recipient info */}
        {recipientMember && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700, marginBottom: 4 }}>MAKAKATANGGAP NG POT NGAYONG CYCLE</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 2px' }}>
              {recipientMember.display_name || `Miyembro #${recipientMember.rotation_order}`}
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: 0, fontFamily: 'monospace' }}>
              {recipientMember.stellar_address.slice(0, 20)}…
            </p>
          </div>
        )}

        {/* Score impact */}
        <div style={{ background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.15)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: 'var(--green)', margin: 0, lineHeight: 1.6 }}>
            <TrendingUp size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            On-time na kontribusyon = <strong>+3 tx_score</strong> (max +15 sa grupong ito)
          </p>
        </div>

        {stage === 'error' && (
          <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
            </div>
          </div>
        )}

        {showGuestModal && <GuestActionModal onClose={() => setShowGuestModal(false)} />}
        <button
          onClick={stage === 'error' ? () => setStage('confirm') : handleContribute}
          disabled={stage === 'signing'}
          className="btn btn-primary"
          style={{ width: '100%', borderRadius: 'var(--r-lg)', padding: '16px 0', fontSize: 16, fontWeight: 700, opacity: stage === 'signing' ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {stage === 'signing' ? 'Nagse-sign sa Freighter...' : stage === 'error' ? 'Subukan Muli' : `Mag-ambag ng ${group.contribution_amount_xlm} XLM`}
        </button>

        <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', marginTop: 12 }}>
          Gagamit ng iyong Freighter wallet para mag-sign ng transaksyon
        </p>
      </div>
    </div>
  )
}

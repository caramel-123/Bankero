import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, Trash2, GripVertical, CheckCircle, Users, Calendar, Coins } from 'lucide-react'
import { supabase } from '../lib/supabase'
import GuestActionModal from '../components/GuestActionModal'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const STEPS = ['Group Details', 'Members', 'Review', 'Confirm']

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
              background: i < current ? 'var(--green)' : i === current ? 'var(--green)' : 'var(--surface-3)',
              color: i <= current ? '#fff' : 'var(--ink-4)',
              border: i === current ? '2px solid var(--green)' : '2px solid transparent',
            }}>
              {i < current ? <CheckCircle size={14} strokeWidth={2.5} /> : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === current ? 'var(--green)' : 'var(--ink-4)', whiteSpace: 'nowrap', fontWeight: i === current ? 700 : 400 }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? 'var(--green)' : 'var(--surface-3)', margin: '0 6px', marginBottom: 20 }} />
          )}
        </div>
      ))}
    </div>
  )
}

interface MemberEntry { stellar_address: string; display_name: string }

export default function PaluwaganCreate({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [groupName, setGroupName] = useState('')
  const [contributionXlm, setContributionXlm] = useState(20)
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly')
  const [members, setMembers] = useState<MemberEntry[]>([
    { stellar_address: '', display_name: '' },
    { stellar_address: '', display_name: '' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showGuestModal, setShowGuestModal] = useState(false)

  function addMember() {
    if (members.length >= 9) return  // max 10 including organizer
    setMembers(m => [...m, { stellar_address: '', display_name: '' }])
  }

  function removeMember(i: number) {
    if (members.length <= 2) return
    setMembers(m => m.filter((_, idx) => idx !== i))
  }

  function updateMember(i: number, field: keyof MemberEntry, val: string) {
    setMembers(m => m.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  // Rotation order: members in order, organizer auto-placed NOT first
  const allMembers: MemberEntry[] = [
    ...members,
    { stellar_address: wallet.publicKey ?? 'GUEST_DEMO_MODE', display_name: 'You (Organizer)' },
  ]
  const potPerCycle = contributionXlm * allMembers.length

  const step0Valid = groupName.trim().length >= 3 && contributionXlm >= 10
  const step1Valid = members.every(m => m.stellar_address.length >= 10) && members.length >= 2
  const totalMembers = allMembers.length // organizer included

  async function handleSubmit() {
    if (wallet.isGuest) { setShowGuestModal(true); return }
    setSubmitting(true)
    setError('')
    try {
      const { data: user } = await supabase
        .from('users').select('id').eq('wallet_address', wallet.publicKey!).maybeSingle()
      if (!user) throw new Error('Your account was not found.')

      // Ensure organizer is not first in rotation — insert organizer at last position
      const rotationMembers = [...members, { stellar_address: wallet.publicKey!, display_name: 'You' }]

      // Insert group
      const { data: group, error: gErr } = await supabase
        .from('paluwagan_groups')
        .insert({
          group_id_onchain: Math.floor(Math.random() * 999999), // replaced by contract call in prod
          organizer_id: user.id,
          group_name: groupName.trim(),
          contribution_amount_xlm: contributionXlm,
          cycle_frequency: frequency,
          total_cycles: rotationMembers.length,
          next_deadline: new Date(Date.now() + (frequency === 'weekly' ? 7 : 30) * 86_400_000).toISOString(),
        })
        .select()
        .single()
      if (gErr) throw gErr

      // Insert members
      const memberRows = rotationMembers.map((m, i) => ({
        group_id: group.id,
        user_id: user.id,   // simplified — in prod, resolve each wallet to user_id
        stellar_address: m.stellar_address,
        rotation_order: i + 1,
      }))
      const { error: mErr } = await supabase.from('paluwagan_members').insert(memberRows)
      if (mErr) throw mErr

      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,.15)', border: '2px solid rgba(22,163,74,.3)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} color="var(--green)" strokeWidth={1.5} />
        </div>
        <h2 className="heading" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>Paluwagan Created!</h2>
        <p style={{ color: 'var(--ink-3)', marginBottom: 8, lineHeight: 1.6 }}>
          <strong>{groupName}</strong> is now registered on-chain. Each member will receive a notification on the first cycle.
        </p>
        <p style={{ fontSize: 13, color: 'var(--green)', marginBottom: 28 }}>+5 anchor_score as organizer when the group completes!</p>
        <button onClick={() => nav('/paluwagan')} className="btn btn-primary" style={{ borderRadius: 'var(--r-lg)', padding: '12px 28px' }}>
          View My Paluwagan
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', fontFamily: 'var(--font)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        <button onClick={() => step === 0 ? nav('/paluwagan') : setStep(s => s - 1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
          <ArrowLeft size={15} /> {step === 0 ? 'Bumalik' : 'Nakaraan'}
        </button>

        <h1 className="heading" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 24 }}>Gumawa ng Paluwagan</h1>

        <StepIndicator current={step} />

        {/* ── Step 0: Group details ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 8 }}>Pangalan ng Grupo</label>
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder='Hal. "Paluwagan ng Kaibigan"'
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--ink)', fontSize: 15, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 8 }}>
                Kontribusyon bawat Cycle (XLM)
              </label>
              <input
                type="number" min={10} step={5}
                value={contributionXlm}
                onChange={e => setContributionXlm(Number(e.target.value))}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--ink)', fontSize: 15, boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6 }}>Minimum: 10 XLM bawat miyembro</p>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 10 }}>Frequency</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['weekly', 'monthly'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      background: frequency === f ? 'var(--green)' : 'var(--panel)',
                      color: frequency === f ? '#fff' : 'var(--ink-3)',
                      border: `1px solid ${frequency === f ? 'var(--green)' : 'var(--border)'}`,
                    }}
                  >
                    {f === 'weekly' ? '📅 Lingguhán' : '🗓️ Buwanán'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              disabled={!step0Valid}
              className="btn btn-primary"
              style={{ borderRadius: 'var(--r-lg)', padding: '14px 0', fontSize: 15, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: step0Valid ? 1 : 0.4 }}
            >
              Susunod <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── Step 1: Members ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0 }}>
              Idagdag ang mga miyembro (minimum 2, maximum 9 bukod sa iyo). Ang order ay siyang rotation ng pagkuha ng pot.
            </p>

            {/* Organizer note */}
            <div style={{ padding: '12px 16px', background: 'rgba(22,163,74,.08)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 'var(--r-md)' }}>
              <p style={{ fontSize: 13, color: 'var(--green)', margin: 0 }}>
                Ikaw bilang organizer ay <strong>hindi</strong> maaaring maging unang tatanggap ng pot. Awtomatiko kang ilalagay sa huling posisyon.
              </p>
            </div>

            {members.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 12 }}>
                  <GripVertical size={14} color="var(--ink-4)" />
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 700, width: 18, textAlign: 'center' }}>#{i + 1}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    value={m.display_name}
                    onChange={e => updateMember(i, 'display_name', e.target.value)}
                    placeholder="Pangalan (optional)"
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--ink)', fontSize: 13, boxSizing: 'border-box', width: '100%' }}
                  />
                  <input
                    value={m.stellar_address}
                    onChange={e => updateMember(i, 'stellar_address', e.target.value)}
                    placeholder="Stellar wallet address (G...)"
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--ink)', fontSize: 12, fontFamily: 'monospace', boxSizing: 'border-box', width: '100%' }}
                  />
                </div>
                <button onClick={() => removeMember(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 4px', color: 'var(--ink-4)' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {members.length < 9 && (
              <button onClick={addMember} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', padding: '10px 16px', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 14 }}>
                <Plus size={14} /> Dagdag na Miyembro
              </button>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="btn btn-primary"
              style={{ borderRadius: 'var(--r-lg)', padding: '14px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: step1Valid ? 1 : 0.4 }}
            >
              I-review <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--panel)', borderRadius: 'var(--r-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Pangalan</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{groupName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Kontribusyon</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{contributionXlm} XLM / cycle</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Frequency</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{frequency === 'weekly' ? 'Lingguhán' : 'Buwanán'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Bilang ng Miyembro</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{totalMembers} (kasama ikaw)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Pot bawat Cycle</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>{potPerCycle} XLM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Bilang ng Cycles</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{totalMembers} cycles total</span>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Rotation Order</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allMembers.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--panel)', borderRadius: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === allMembers.length - 1 ? 'rgba(22,163,74,.15)' : 'var(--surface-3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: i === allMembers.length - 1 ? 'var(--green)' : 'var(--ink-3)' }}>#{i + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{m.display_name || `Miyembro ${i + 1}`}</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: 0, fontFamily: 'monospace' }}>{m.stellar_address.slice(0, 12)}…</p>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Cycle {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="btn btn-primary"
              style={{ borderRadius: 'var(--r-lg)', padding: '14px 0', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Kumpirmahin <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── Step 3: Confirm & sign ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 'var(--r-lg)', padding: 20 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Coins size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>On-chain na transaksyon</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, lineHeight: 1.6 }}>
                    Kapag nag-sign ka sa Freighter, malilikha ang paluwagan group on the Stellar blockchain. Hindi na ito mababago.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Calendar size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0, lineHeight: 1.6 }}>
                  Unang deadline: <strong>{frequency === 'weekly' ? '7 araw' : '30 araw'}</strong> mula ngayon. Palagi kang makakatanggap ng reminders bago mag-contribute.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24, textAlign: 'center', padding: '16px 0' }}>
              {[
                { icon: <Users size={20} color="var(--green)" />, label: `${totalMembers} Miyembro` },
                { icon: <Coins size={20} color="#F59E0B" />, label: `${potPerCycle} XLM Pot` },
                { icon: <Calendar size={20} color="var(--ink-3)" />, label: `${totalMembers} Cycles` },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {item.icon}
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{item.label}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 10 }}>
                <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
              </div>
            )}

            {showGuestModal && <GuestActionModal onClose={() => setShowGuestModal(false)} />}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary"
              style={{ borderRadius: 'var(--r-lg)', padding: '16px 0', fontSize: 16, fontWeight: 700, opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {submitting ? 'Registering...' : 'Sign & Create'}
            </button>
            <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', margin: 0 }}>
              Gagamit ng Freighter Wallet para sa on-chain signing
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

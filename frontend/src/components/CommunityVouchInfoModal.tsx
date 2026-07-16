import { Users, X } from 'lucide-react'

export default function CommunityVouchInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,31,58,.5)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div style={{ width: 560, maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px rgba(11,31,58,.24)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F1F5F9', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
          <X size={15} strokeWidth={2} />
        </button>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(251,191,36,.14)', border: '1.5px solid rgba(251,191,36,.35)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <Users size={24} strokeWidth={1.75} color="#B45309" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>How Community Vouch works</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.6 }}>
          Friends or community members stake real XLM to back your loan — a co-signer, not a lender. It's optional, and doesn't affect your loan amount either way. It only changes how much protection a lender sees behind you.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>If you repay on time</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              Every voucher gets their full stake back, plus a small reward — 1% of your total repayment, split among them in proportion to how much each staked. Bigger stakes earn a bigger share of that 1%.
            </p>
          </div>
          <div style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>If you default</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              Every voucher's staked XLM is automatically sent to your lender instead — they lose exactly what they staked. That's the real risk they're taking on to back you.
            </p>
          </div>
          <div style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Why it helps your application</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              A lender can see who's backing you and how much they staked. Real people risking real money on your behalf is a strong trust signal — usually a better approval chance than your history alone.
            </p>
          </div>
        </div>

        <button onClick={onClose} style={{ width: '100%', marginTop: 20, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', cursor: 'pointer' }}>
          Got it
        </button>
      </div>
    </div>
  )
}

import { PiggyBank, X } from 'lucide-react'

export default function SavingsCollateralInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,31,58,.5)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div style={{ width: 560, maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 24, padding: 32, boxShadow: '0 24px 64px rgba(11,31,58,.24)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#F1F5F9', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-3)' }}>
          <X size={15} strokeWidth={2} />
        </button>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(96,165,250,.14)', border: '1.5px solid rgba(96,165,250,.35)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
          <PiggyBank size={24} strokeWidth={1.75} color="#2563EB" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>How Savings Collateral works</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.6 }}>
          You choose an amount from your own Savings Bank balance to put on the line as backing for this loan — your own money, standing in for a co-signer. It's optional and entirely your choice how much.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>While the loan is active</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              The amount you offer gets locked the moment the loan is disbursed — it's reserved, not spent, so it can't be withdrawn until the loan is resolved. The rest of your savings stays completely free to use.
            </p>
          </div>
          <div style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>If you repay on time</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              Your locked amount unlocks automatically — it goes right back to being normal, spendable savings. Nothing is deducted; it's your own money returned in full.
            </p>
          </div>
          <div style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>If you default</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              The locked amount is automatically sent to your lender to cover part or all of their loss — no other savings beyond what you chose to lock is ever touched.
            </p>
          </div>
          <div style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border-2)', background: 'var(--surface-2)', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Why it helps your application</div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
              A lender can see the exact amount you've put on the line. Having your own money backing the loan — not just a promise — is a strong trust signal, even if you don't have anyone available to vouch for you.
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

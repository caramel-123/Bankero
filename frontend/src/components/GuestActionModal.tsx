import { useNavigate } from 'react-router-dom'
import { Wallet, X, Lock } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function GuestActionModal({ onClose }: Props) {
  const nav = useNavigate()
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface, #fff)',
          borderRadius: 20,
          padding: '32px 28px',
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,.3)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4, #94A3B8)', padding: 4 }}
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(245,158,11,.12)', border: '2px solid rgba(245,158,11,.3)',
          display: 'grid', placeItems: 'center', margin: '0 auto 20px',
        }}>
          <Lock size={28} color="#F59E0B" strokeWidth={1.75} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink, #0F172A)', marginBottom: 10 }}>
          You're in Demo Mode
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3, #64748B)', lineHeight: 1.65, marginBottom: 28 }}>
          Connect a Freighter wallet to perform financial activities like applying for loans, vouching, contributing to Paluwagan, and more.
        </p>

        <button
          onClick={() => { onClose(); nav('/login') }}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            background: '#16A34A', color: '#fff',
            fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 10,
          }}
        >
          <Wallet size={16} strokeWidth={2} /> Connect Wallet
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12,
            background: 'transparent', color: 'var(--ink-4, #94A3B8)',
            fontWeight: 600, fontSize: 14, border: '1.5px solid var(--border, #E2E8F0)', cursor: 'pointer',
          }}
        >
          Continue Browsing Demo
        </button>
      </div>
    </div>
  )
}

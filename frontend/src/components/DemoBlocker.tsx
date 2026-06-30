import { useNavigate } from 'react-router-dom'
import { Lock, Wallet } from 'lucide-react'

interface Props {
  onClose: () => void
  action?: string
}

export default function DemoBlocker({ onClose, action = 'gawin ito' }: Props) {
  const nav = useNavigate()
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--panel)', borderRadius: 'var(--r-2xl)',
          padding: '32px 28px', maxWidth: 360, width: '100%',
          textAlign: 'center', border: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Lock size={24} color="#F59E0B" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Demo Mode
        </h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, marginBottom: 24 }}>
          Hindi mo maisasagawa ang "{action}" sa demo mode. I-connect ang iyong Freighter wallet para sa tunay na transaksyon.
        </p>
        <button
          onClick={() => nav('/login')}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            background: '#16A34A', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            minHeight: 48,
          }}
        >
          <Wallet size={16} /> I-connect ang Wallet
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12,
            background: 'transparent', color: 'rgba(255,255,255,.4)',
            border: 'none', cursor: 'pointer',
            fontSize: 14, marginTop: 8,
          }}
        >
          Magpatuloy sa Demo
        </button>
      </div>
    </div>
  )
}

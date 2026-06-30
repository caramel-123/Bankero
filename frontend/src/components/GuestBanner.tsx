import { useNavigate } from 'react-router-dom'
import { Wallet, Eye } from 'lucide-react'

export default function GuestBanner() {
  const nav = useNavigate()
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'linear-gradient(90deg, #92400e, #78350f)',
      borderBottom: '1px solid rgba(245,158,11,.3)',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      flexWrap: 'wrap',
    }}>
      <Eye size={15} color="#fbbf24" />
      <span style={{ fontSize: 13, color: '#fde68a', fontWeight: 600, flex: 1 }}>
        Demo Mode — Ikaw ay nasa guest view. Hindi maisasagawa ang mga aksyon.
      </span>
      <button
        onClick={() => nav('/login')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          background: '#F59E0B', color: '#000',
          border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
          minHeight: 36,
        }}
      >
        <Wallet size={13} /> Connect Wallet
      </button>
    </div>
  )
}

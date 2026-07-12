import { useNavigate } from 'react-router-dom'
import { Home, CreditCard, Camera, FileText, UserCircle } from 'lucide-react'

export type NavTab = 'home' | 'loan' | 'scan' | 'transaction' | 'profile'

const ITEMS: { tab: NavTab; icon: typeof Home; label: string; path: string }[] = [
  { tab: 'home',        icon: Home,       label: 'Home',        path: '/home' },
  { tab: 'loan',        icon: CreditCard, label: 'Loan',         path: '/apply' },
  { tab: 'scan',        icon: Camera,     label: 'Scan',         path: '/scan' },
  { tab: 'transaction', icon: FileText,   label: 'Transaction',  path: '/loans' },
  { tab: 'profile',     icon: UserCircle, label: 'Profile',      path: '/account' },
]

/** Persistent bottom navigation for the 5 primary destinations, with a highlighted circular camera button in the middle. */
export default function BottomNav({ active }: { active: NavTab }) {
  const nav = useNavigate()

  return (
    <nav className="mobile-bottom-nav" style={{ alignItems: 'flex-end' }}>
      {ITEMS.map(item => {
        const Icon = item.icon
        const isActive = item.tab === active

        if (item.tab === 'scan') {
          return (
            <button
              key={item.tab}
              onClick={() => nav(item.path)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                position: 'relative', top: -18,
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: isActive ? '#4ADE80' : 'var(--green)',
                display: 'grid', placeItems: 'center',
                boxShadow: '0 6px 18px rgba(34,197,94,.45)',
                border: '3px solid var(--panel)',
              }}>
                <Icon size={22} strokeWidth={2.25} color="#fff" />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? 'var(--green)' : 'rgba(255,255,255,.4)', marginTop: 4 }}>
                {item.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={item.tab}
            onClick={() => nav(item.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: isActive ? 'var(--green)' : 'rgba(255,255,255,.4)', fontSize: 9, fontWeight: 700,
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

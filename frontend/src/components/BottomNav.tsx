import { useNavigate } from 'react-router-dom'
import { Home, CreditCard, Camera, FileText, UserCircle } from 'lucide-react'
import { useBorrowerLoanAlert } from '../hooks/useLoanAlerts'

export type NavTab = 'home' | 'loan' | 'scan' | 'transaction' | 'profile'

const ITEMS: { tab: NavTab; icon: typeof Home; label: string; path: string }[] = [
  { tab: 'home',        icon: Home,       label: 'Home',        path: '/home' },
  { tab: 'loan',        icon: CreditCard, label: 'Loan',         path: '/apply' },
  { tab: 'scan',        icon: Camera,     label: 'Scan',         path: '/scan' },
  { tab: 'transaction', icon: FileText,   label: 'Transaction',  path: '/loans' },
  { tab: 'profile',     icon: UserCircle, label: 'Profile',      path: '/account' },
]

/** Small red dot badge — flags a nav tab that has something needing the user's attention. */
function AlertDot() {
  return (
    <span style={{
      position: 'absolute', top: -1, right: -2, width: 9, height: 9, borderRadius: '50%',
      background: '#EF4444', border: '2px solid var(--panel)',
    }} />
  )
}

/**
 * Persistent bottom navigation for the 5 primary destinations, with a
 * highlighted circular camera button in the middle. Pass `walletAddress`
 * so the Transaction tab can show a red dot when a loan needs attention
 * (approved, awaiting disbursement, or disbursed and awaiting repayment).
 */
export default function BottomNav({ active, walletAddress }: { active: NavTab; walletAddress?: string | null }) {
  const nav = useNavigate()
  const hasLoanAlert = useBorrowerLoanAlert(walletAddress)

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
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {item.tab === 'transaction' && hasLoanAlert && <AlertDot />}
            </span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

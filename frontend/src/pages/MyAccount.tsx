import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Wallet, Copy, Check, Award, ChevronRight, LogOut } from 'lucide-react'
import { formatWallet } from '../lib/stellar'
import { signOutBorrower } from '../lib/supabase'
import { useAuthUser } from '../hooks/useAuthUser'
import BottomNav from '../components/BottomNav'
import CreditCertificate from './CreditCertificate'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

export default function MyAccount({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const auth = useAuthUser()
  const [copied, setCopied] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)

  function copyAddress() {
    if (!wallet.publicKey) return
    navigator.clipboard.writeText(wallet.publicKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSignOut() {
    wallet.disconnect()
    await signOutBorrower()
    nav('/login')
  }

  if (showCertificate) {
    return <CreditCertificate wallet={wallet} onBack={() => setShowCertificate(false)} />
  }

  const name = wallet.isGuest
    ? 'Guest / Demo Mode'
    : (auth.user?.first_name && auth.user?.last_name
        ? `${auth.user.first_name} ${auth.user.last_name}`
        : auth.user?.display_name) || 'Bankero Borrower'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '28px 20px 100px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={() => nav('/home')} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>My Account</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 28 }}>
          Your account details and credit certificate.
        </p>

        {/* Name card — set at signup, not editable */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
            Name
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EEF2FF', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <User size={18} color="#4F46E5" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Signed-in name · can't be changed here</div>
            </div>
          </div>
        </div>

        {/* Wallet card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 12 }}>
            Connected Wallet
          </div>
          {wallet.isGuest ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F1F5F9', display: 'grid', placeItems: 'center' }}>
                <Wallet size={18} color="#94A3B8" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Guest / Demo Mode</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Connect a real wallet from Home</div>
              </div>
            </div>
          ) : wallet.publicKey ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#DCFCE7', display: 'grid', placeItems: 'center' }}>
                <Wallet size={18} color="#16A34A" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatWallet(wallet.publicKey)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>Stellar Testnet</div>
              </div>
              <button onClick={copyAddress} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, padding: '6px 10px', fontSize: 12 }}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F1F5F9', display: 'grid', placeItems: 'center' }}>
                <Wallet size={18} color="#94A3B8" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>No wallet connected</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Connect one from the Home screen</div>
              </div>
            </div>
          )}
        </div>

        {/* Certificate */}
        <button
          onClick={() => setShowCertificate(true)}
          className="card"
          style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 18 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F3FF', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Award size={18} color="#7C3AED" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Credit Certificate</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Download proof of good credit to show lenders & banks</div>
          </div>
          <ChevronRight size={16} color="var(--ink-4)" />
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="card"
          style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 18 }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(220,38,38,.08)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <LogOut size={18} color="#DC2626" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>Sign Out</div>
          </div>
        </button>

        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.15)' }}>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
            Your wallet address and financial data remain private. Only your name appears on public feedback.
          </p>
        </div>

      </div>
      <BottomNav active="profile" walletAddress={wallet.isGuest ? null : wallet.publicKey} />
    </div>
  )
}

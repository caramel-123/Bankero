import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useWallet } from './hooks/useWallet'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ScoreDetails from './pages/ScoreDetails'
import LoanApply from './pages/LoanApply'
import LoanTracking from './pages/LoanTracking'
import Vouch from './pages/Vouch'
import LenderDashboard from './pages/LenderDashboard'
import CreditCertificate from './pages/CreditCertificate'
import POPRegistration from './pages/POPRegistration'
import POPSubmission from './pages/POPSubmission'
import POPHistory from './pages/POPHistory'
import SavingsTrackerPage from './pages/SavingsTracker'

// Allows both real wallet and guest mode
function ProtectedRoute({ children, publicKey }: { children: React.ReactNode; publicKey: string | null }) {
  if (!publicKey) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Syncs iframe src when the outer app navigates
function IframePhone(_: { onClose: () => void }) {
  const location = useLocation()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (iframeRef.current) {
      const target = window.location.origin + location.pathname + location.search
      if (iframeRef.current.src !== target) {
        iframeRef.current.src = target
      }
    }
  }, [location])

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#111',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: 24,
      paddingBottom: 80,
    }}>
      {/* Phone shell */}
      <div style={{
        width: 390,
        height: 780,
        border: '8px solid #1a1a1a',
        borderRadius: 48,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.7)',
        background: '#fff',
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 28, background: '#1a1a1a',
          borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
          zIndex: 10,
          pointerEvents: 'none',
        }} />
        {/* iframe renders at true 390px viewport — vw/vh/clamp all compute correctly */}
        <iframe
          ref={iframeRef}
          src={window.location.origin + location.pathname + location.search}
          style={{
            width: '100%',
            flex: 1,
            border: 'none',
            display: 'block',
          }}
          title="Mobile preview"
        />
      </div>
    </div>
  )
}

export default function App() {
  const wallet = useWallet()
  const [mobileMode, setMobileMode] = useState(false)

  return (
    <BrowserRouter>
      <AppInner wallet={wallet} mobileMode={mobileMode} setMobileMode={setMobileMode} />
    </BrowserRouter>
  )
}

function AppInner({
  wallet,
  mobileMode,
  setMobileMode,
}: {
  wallet: ReturnType<typeof useWallet>
  mobileMode: boolean
  setMobileMode: (v: boolean | ((p: boolean) => boolean)) => void
}) {
  return (
    <>
      {mobileMode ? (
        <IframePhone onClose={() => setMobileMode(false)} />
      ) : (
        <Routes>
          <Route path="/" element={<Landing connectAsGuest={wallet.connectAsGuest} />} />
          <Route path="/login" element={<Login wallet={wallet} />} />
          <Route path="/dashboard" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <Dashboard wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/score" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <ScoreDetails wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/apply" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <LoanApply wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/loans" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <LoanTracking wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/vouch" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <Vouch wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/lender" element={<LenderDashboard wallet={wallet} />} />
          <Route path="/certificate" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <CreditCertificate wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/pop/register" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <POPRegistration wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/pop/submit" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <POPSubmission wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/pop/history" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <POPHistory wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="/savings" element={
            <ProtectedRoute publicKey={wallet.publicKey}>
              <SavingsTrackerPage wallet={wallet} />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}

    </>
  )
}

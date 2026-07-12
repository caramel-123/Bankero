import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useWallet } from './hooks/useWallet'
import { useAuthUser } from './hooks/useAuthUser'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Home from './pages/Home'
import LoanApply from './pages/LoanApply'
import LoanTracking from './pages/LoanTracking'
import Vouch from './pages/Vouch'
import LenderDashboard from './pages/LenderDashboard'
import ScanEpayment from './pages/ScanEpayment'
import SavingsTrackerPage from './pages/SavingsTracker'
import SavingsBank from './pages/SavingsBank'
import PaluwaganList from './pages/PaluwaganList'
import PaluwaganCreate from './pages/PaluwaganCreate'
import PaluwaganDetail from './pages/PaluwaganDetail'
import PaluwaganContribute from './pages/PaluwaganContribute'
import MyAccount from './pages/MyAccount'
import Onboarding from './pages/Onboarding'
type AuthHook = ReturnType<typeof useAuthUser>

/**
 * Gate on login only — reachable whether or not a wallet is connected yet.
 * Guest/demo mode (wallet.isGuest) bypasses the login requirement entirely,
 * same as it always has — there's just no button pointing at it anymore.
 */
function AuthProtectedRoute({ children, auth, isGuest }: { children: React.ReactNode; auth: AuthHook; isGuest: boolean }) {
  if (isGuest) return <>{children}</>
  if (auth.loadState === 'loading') return null
  if (!auth.isAuthed) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Gate on login AND a connected wallet — for anything that moves funds. Guest mode bypasses both. */
function WalletProtectedRoute({ children, auth, publicKey, isGuest }: { children: React.ReactNode; auth: AuthHook; publicKey: string | null; isGuest: boolean }) {
  if (isGuest) return <>{children}</>
  if (auth.loadState === 'loading') return null
  if (!auth.isAuthed) return <Navigate to="/login" replace />
  if (!publicKey) return <Navigate to="/home" replace state={{ needsWallet: true }} />
  return <>{children}</>
}

export default function App() {
  const wallet = useWallet()
  const auth = useAuthUser()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={
          <AuthProtectedRoute auth={auth} isGuest={wallet.isGuest}>
            <Home wallet={wallet} authUser={auth.user} />
          </AuthProtectedRoute>
        } />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/score" element={<Navigate to="/loans" replace />} />
        <Route path="/certificate" element={<Navigate to="/account" replace />} />
        <Route path="/apply" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <LoanApply wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/loans" element={
          <AuthProtectedRoute auth={auth} isGuest={wallet.isGuest}>
            <LoanTracking wallet={wallet} />
          </AuthProtectedRoute>
        } />
        <Route path="/vouch" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <Vouch wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/lender" element={<LenderDashboard wallet={wallet} />} />
        <Route path="/scan" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <ScanEpayment wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/savings" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <SavingsTrackerPage wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/savings-bank" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <SavingsBank wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/paluwagan" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <PaluwaganList wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/paluwagan/create" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <PaluwaganCreate wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/paluwagan/:id" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <PaluwaganDetail wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/paluwagan/:id/contribute" element={
          <WalletProtectedRoute auth={auth} publicKey={wallet.publicKey} isGuest={wallet.isGuest}>
            <PaluwaganContribute wallet={wallet} />
          </WalletProtectedRoute>
        } />
        <Route path="/account" element={
          <AuthProtectedRoute auth={auth} isGuest={wallet.isGuest}>
            <MyAccount wallet={wallet} />
          </AuthProtectedRoute>
        } />
        <Route path="/onboarding" element={<Onboarding wallet={wallet} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

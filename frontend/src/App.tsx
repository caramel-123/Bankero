import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import PaluwaganList from './pages/PaluwaganList'
import PaluwaganCreate from './pages/PaluwaganCreate'
import PaluwaganDetail from './pages/PaluwaganDetail'
import PaluwaganContribute from './pages/PaluwaganContribute'
import MyAccount from './pages/MyAccount'

function ProtectedRoute({ children, publicKey }: { children: React.ReactNode; publicKey: string | null }) {
  if (!publicKey) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const wallet = useWallet()

  return (
    <BrowserRouter>
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
        <Route path="/paluwagan" element={
          <ProtectedRoute publicKey={wallet.publicKey}>
            <PaluwaganList wallet={wallet} />
          </ProtectedRoute>
        } />
        <Route path="/paluwagan/create" element={
          <ProtectedRoute publicKey={wallet.publicKey}>
            <PaluwaganCreate wallet={wallet} />
          </ProtectedRoute>
        } />
        <Route path="/paluwagan/:id" element={
          <ProtectedRoute publicKey={wallet.publicKey}>
            <PaluwaganDetail wallet={wallet} />
          </ProtectedRoute>
        } />
        <Route path="/paluwagan/:id/contribute" element={
          <ProtectedRoute publicKey={wallet.publicKey}>
            <PaluwaganContribute wallet={wallet} />
          </ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute publicKey={wallet.publicKey}>
            <MyAccount wallet={wallet} />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

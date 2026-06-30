import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle, XCircle, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  uploadDocuments,
  extractBillData,
  extractReceiptData,
  validateSubmission,
  recordVerifiedPayment,
} from '../services/popVerification'
import type { UtilityAccount, ValidationResult } from '../types/pop'
import GuestActionModal from '../components/GuestActionModal'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const STEPS = [
  'Uploading documents...',
  'Reading bill with AI...',
  'Reading receipt with AI...',
  'Verifying your payment...',
  'Saving results...',
]

function UploadZone({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      style={{
        width: '100%', padding: '28px 16px', borderRadius: 14,
        border: `2px dashed ${file ? '#16A34A' : '#D4DCE0'}`,
        background: file ? '#F0FDF4' : '#F8FAFC',
        color: file ? '#16A34A' : '#94A3B8',
        cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box',
        transition: 'all 150ms',
      }}
    >
      <Upload size={24} color={file ? '#16A34A' : '#94A3B8'} style={{ margin: '0 auto 10px', display: 'block' }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: file ? '#16A34A' : '#475569', marginBottom: 4 }}>{label}</div>
      {file
        ? <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>{file.name}</div>
        : <div style={{ fontSize: 12, color: '#94A3B8' }}>Tap to choose an image</div>
      }
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </button>
  )
}

export default function POPSubmission({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [billFile, setBillFile] = useState<File | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [step, setStep] = useState(-1)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)

  async function handleSubmit() {
    if (wallet.isGuest) { setShowGuestModal(true); return }
    if (!wallet.publicKey || !billFile || !receiptFile) return
    setError('')
    setResult(null)

    try {
      const { data: user } = await supabase.from('users').select('id, display_name').eq('wallet_address', wallet.publicKey).maybeSingle()
      if (!user) throw new Error('Your account was not found.')

      const { data: accounts } = await supabase.from('utility_accounts').select('*').eq('user_id', user.id)
      if (!accounts || accounts.length === 0) {
        setError('You have no registered utility account yet. Please register first.')
        return
      }
      const account = accounts[0] as UtilityAccount

      const { data: lastStreak } = await supabase.from('pop_streaks').select('last_verified_period').eq('user_id', user.id).eq('utility_account_id', account.id).maybeSingle()

      setStep(0)
      const { billUrl, receiptUrl } = await uploadDocuments(billFile, receiptFile, user.id)

      setStep(1)
      const billData = await extractBillData(billUrl)

      setStep(2)
      const receiptData = await extractReceiptData(receiptUrl)

      setStep(3)
      const validation = await validateSubmission(billData, receiptData, account, user.display_name ?? '', lastStreak?.last_verified_period ?? null)
      setResult(validation)

      setStep(4)
      await recordVerifiedPayment(user.id, account.id, account.biller_name, billUrl, receiptUrl, validation)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred. Please try again.')
    } finally {
      setStep(-1)
    }
  }

  if (done && result) return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: result.passed ? '#F0FDF4' : '#FEF2F2',
            display: 'grid', placeItems: 'center',
          }}>
            {result.passed
              ? <CheckCircle size={36} color="#16A34A" strokeWidth={1.5} />
              : <XCircle size={36} color="#DC2626" strokeWidth={1.5} />
            }
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
            {result.passed ? 'Payment Verified!' : 'Verification Failed'}
          </h2>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            {result.passed
              ? 'Your payment has been verified and recorded.'
              : 'There were issues with your documents. See details below.'}
          </p>
          {result.errors.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', marginBottom: 8 }}>
                  <XCircle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#DC2626' }}>{e}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => nav('/pop/history')} className="btn btn-primary" style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, marginBottom: 10 }}>View History</button>
          <button onClick={() => nav('/dashboard')} className="btn btn-ghost" style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Dashboard</button>
        </div>
      </div>
    </div>
  )

  const canSubmit = step < 0 && !!billFile && !!receiptFile

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Submit Bill</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Upload a photo of your bill and GCash receipt to verify your payment.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Upload card */}
          <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Upload Documents</div>
            <UploadZone label="Bill Photo" file={billFile} onFile={setBillFile} />
            <UploadZone label="GCash / Maya Receipt" file={receiptFile} onFile={setReceiptFile} />
          </div>

          {/* Progress */}
          {step >= 0 && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
              <Loader size={18} color="#16A34A" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>{STEPS[step]}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#DC2626', fontSize: 14 }}>
              {error}
            </div>
          )}

          {showGuestModal && <GuestActionModal onClose={() => setShowGuestModal(false)} />}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn btn-primary"
            style={{
              width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 15, fontWeight: 700,
              opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {step >= 0 ? 'Processing...' : 'Verify Payment'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

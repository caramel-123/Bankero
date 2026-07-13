import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle, XCircle, Loader, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  uploadEpaymentImage, extractEpaymentData, validateEpaymentScan, recordEpaymentScan, MAX_SCAN_BONUS,
} from '../services/epaymentScan'
import type { EpaymentValidationResult } from '../types/epaymentScan'
import GuestActionModal from '../components/GuestActionModal'
import BottomNav from '../components/BottomNav'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const STEPS = ['Uploading image...', 'Reading transaction with AI...', 'Verifying...', 'Saving results...']

function UploadZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      style={{
        width: '100%', padding: '36px 16px', borderRadius: 14,
        border: `2px dashed ${file ? '#16A34A' : '#D4DCE0'}`,
        background: file ? '#F0FDF4' : '#F8FAFC',
        color: file ? '#16A34A' : '#94A3B8',
        cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box',
      }}
    >
      {file ? <CheckCircle size={28} color="#16A34A" style={{ margin: '0 auto 10px', display: 'block' }} />
            : <Camera size={28} color="#94A3B8" style={{ margin: '0 auto 10px', display: 'block' }} />}
      <div style={{ fontSize: 14, fontWeight: 700, color: file ? '#16A34A' : '#475569', marginBottom: 4 }}>
        {file ? file.name : 'Scan an e-payment transaction'}
      </div>
      <div style={{ fontSize: 12, color: '#94A3B8' }}>
        {file ? 'Tap to choose a different photo' : 'GCash, Maya, or any e-wallet confirmation screenshot'}
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </button>
  )
}

export default function ScanEpayment({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState(-1)
  const [result, setResult] = useState<EpaymentValidationResult | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)

  async function handleSubmit() {
    if (wallet.isGuest) { setShowGuestModal(true); return }
    if (!wallet.publicKey || !file) return
    setError('')
    setResult(null)

    try {
      const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet.publicKey).maybeSingle()
      if (!user) throw new Error('Your account was not found.')

      setStep(0)
      const imageUrl = await uploadEpaymentImage(file, user.id)

      setStep(1)
      const data = await extractEpaymentData(imageUrl)

      setStep(2)
      const validation = await validateEpaymentScan(data)
      setResult(validation)

      setStep(3)
      await recordEpaymentScan(user.id, wallet.publicKey, imageUrl, validation)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setStep(-1)
    }
  }

  if (done && result) return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px 100px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: result.passed ? '#F0FDF4' : '#FEF2F2',
            display: 'grid', placeItems: 'center',
          }}>
            {result.passed
              ? <CheckCircle size={36} color="#16A34A" strokeWidth={1.5} />
              : <XCircle size={36} color="#DC2626" strokeWidth={1.5} />}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
            {result.passed ? 'Transaction Verified!' : 'Verification Failed'}
          </h2>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            {result.passed
              ? `This transaction has been recorded and added +${2} points toward your Remittance score (capped at +${MAX_SCAN_BONUS}).`
              : 'There were issues reading this transaction. See details below.'}
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
          <button onClick={() => { setDone(false); setFile(null); setResult(null) }} className="btn btn-primary" style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Scan Another</button>
          <button onClick={() => nav('/home')} className="btn btn-ghost" style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 15, fontWeight: 700 }}>Back to Home</button>
        </div>
      </div>
      <BottomNav active="scan" walletAddress={wallet.isGuest ? null : wallet.publicKey} />
    </div>
  )

  const canSubmit = step < 0 && !!file

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '28px 20px 100px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={() => nav('/home')} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Scan E-Payment</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Upload a photo of a GCash, Maya, or other e-wallet transaction. Our AI verifies it and boosts your Remittance score.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div className="card" style={{ padding: 20 }}>
            <UploadZone file={file} onFile={setFile} />
          </div>

          {step >= 0 && (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
              <Loader size={18} color="#16A34A" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>{STEPS[step]}</span>
            </div>
          )}

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
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            <Upload size={16} strokeWidth={2} />
            {step >= 0 ? 'Processing...' : 'Verify Transaction'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <BottomNav active="scan" walletAddress={wallet.isGuest ? null : wallet.publicKey} />
    </div>
  )
}

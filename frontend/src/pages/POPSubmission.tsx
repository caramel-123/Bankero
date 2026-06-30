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
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

const panel = { background: 'var(--panel)', borderRadius: 'var(--r-lg)', padding: 24 }
const btn = (disabled: boolean, color = '#16A34A') => ({
  width: '100%', padding: '14px 0', borderRadius: 12,
  background: disabled ? 'rgba(22,163,74,.3)' : color,
  color: '#fff', fontWeight: 700, fontSize: 15, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer', minHeight: 48,
  transition: 'background 150ms',
})

const STEPS = [
  'Ina-upload ang mga dokumento...',
  'Binabasa ang bill gamit ang AI...',
  'Binabasa ang resibo gamit ang AI...',
  'Sinisigurado namin ang iyong bayad...',
  'Sine-save ang resulta...',
]

function UploadZone({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      style={{
        width: '100%', padding: '24px 16px', borderRadius: 12,
        border: `2px dashed ${file ? '#16A34A' : 'rgba(255,255,255,.15)'}`,
        background: file ? 'rgba(22,163,74,.08)' : 'rgba(255,255,255,.03)',
        color: file ? '#4ade80' : 'rgba(255,255,255,.4)',
        cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box',
        transition: 'all 150ms',
      }}
    >
      <Upload size={24} style={{ margin: '0 auto 8px' }} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      {file
        ? <div style={{ fontSize: 12, marginTop: 4, color: '#4ade80' }}>{file.name}</div>
        : <div style={{ fontSize: 12, marginTop: 4 }}>I-tap para pumili ng larawan</div>
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

  async function handleSubmit() {
    if (wallet.isGuest) {
      // Demo: simulate full POP verification flow
      setError('')
      setResult(null)
      for (let i = 0; i < STEPS.length; i++) {
        setStep(i)
        await new Promise(r => setTimeout(r, 700))
      }
      setResult({ isValid: true, confidence: 0.96, issues: [], summary: 'Bayad na-verify! Demo mode.' })
      setDone(true)
      return
    }
    if (!wallet.publicKey || !billFile || !receiptFile) return
    setError('')
    setResult(null)

    try {
      const { data: user } = await supabase.from('users').select('id, display_name').eq('wallet_address', wallet.publicKey).maybeSingle()
      if (!user) throw new Error('Hindi mahanap ang iyong account.')

      const { data: accounts } = await supabase.from('utility_accounts').select('*').eq('user_id', user.id)
      if (!accounts || accounts.length === 0) {
        setError('Wala ka pang registered na utility account. Mag-register muna.')
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
      setError(e instanceof Error ? e.message : 'May error. Subukan muli.')
    } finally {
      setStep(-1)
    }
  }

  if (done && result) return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ ...panel, textAlign: 'center' }}>
          {result.passed
            ? <CheckCircle size={48} color="#16A34A" style={{ marginBottom: 12 }} />
            : <XCircle size={48} color="#ef4444" style={{ marginBottom: 12 }} />
          }
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            {result.passed ? 'Napatunayan ang Bayad!' : 'Hindi Pumasa ang Verification'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, marginBottom: 20 }}>
            {result.passed
              ? 'Ang iyong bayad ay na-verify at nai-record na.'
              : 'May mga problema sa iyong mga dokumento. Tingnan ang listahan sa ibaba.'}
          </p>
          {result.errors.length > 0 && (
            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              {result.errors.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,.1)', marginBottom: 8 }}>
                  <XCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#fca5a5' }}>{e}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => nav('/pop/history')} style={btn(false)}>Tingnan ang History</button>
          <button onClick={() => nav('/dashboard')} style={{ ...btn(false), background: 'rgba(255,255,255,.07)', marginTop: 10 }}>Dashboard</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> Bumalik
        </button>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Mag-submit ng Bill</h1>
        <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 14, marginBottom: 24 }}>
          Mag-upload ng larawan ng iyong bill at GCash receipt para ma-verify ang iyong bayad.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={panel}>
            <div style={{ marginBottom: 14 }}>
              <UploadZone label="Larawan ng Bill" file={billFile} onFile={setBillFile} />
            </div>
            <UploadZone label="GCash / Maya Receipt" file={receiptFile} onFile={setReceiptFile} />
          </div>

          {step >= 0 && (
            <div style={{ ...panel, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Loader size={20} color="#16A34A" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }}>{STEPS[step]}</span>
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: '#fca5a5', fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            style={btn(step >= 0 || (!wallet.isGuest && (!billFile || !receiptFile)))}
            disabled={step >= 0 || (!wallet.isGuest && (!billFile || !receiptFile))}
          >
            {step >= 0 ? 'Hinihintay...' : 'I-verify ang Bayad'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PiggyBank, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { DEMO_SAVINGS_BANK_BALANCE_XLM, DEMO_SAVINGS_BANK_TRANSACTIONS } from '../lib/demoData'
import { getBalance, getTransactions, deposit, withdraw } from '../services/savingsBank'
import type { SavingsBankTransaction } from '../types/savingsBank'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

type LoadState = 'loading' | 'loaded' | 'error'
type FormMode = 'deposit' | 'withdraw'

export default function SavingsBank({ wallet }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [userId, setUserId] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<SavingsBankTransaction[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [mode, setMode] = useState<FormMode>('deposit')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    if (wallet.isGuest) {
      setBalance(DEMO_SAVINGS_BANK_BALANCE_XLM)
      setTransactions(DEMO_SAVINGS_BANK_TRANSACTIONS as unknown as SavingsBankTransaction[])
      setLoadState('loaded')
      return
    }
    if (!wallet.publicKey) return
    setLoadState('loading')
    try {
      const { data: user } = await supabase
        .from('users').select('id').eq('wallet_address', wallet.publicKey).maybeSingle()
      const uid = user?.id ?? null
      setUserId(uid)

      const [bal, txs] = await Promise.all([
        getBalance(wallet.publicKey),
        uid ? getTransactions(uid, 20) : Promise.resolve([]),
      ])
      setBalance(bal)
      setTransactions(txs)
      setLoadState('loaded')
    } catch (e) {
      console.error('Failed to load savings bank data:', e)
      setErrorMsg(e instanceof Error ? e.message : (e as { message?: string })?.message || 'Something went wrong.')
      setLoadState('error')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey, wallet.isGuest])

  async function handleSubmit() {
    if (wallet.isGuest || !wallet.publicKey || !userId) return
    const amountXlm = parseFloat(amount)
    if (!amountXlm || amountXlm <= 0) {
      setFormError('Enter an amount greater than 0.')
      return
    }
    if (mode === 'withdraw' && amountXlm > balance) {
      setFormError('You can’t withdraw more than your saved balance.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const newBalance = mode === 'deposit'
        ? await deposit(userId, wallet.publicKey, amountXlm)
        : await withdraw(userId, wallet.publicKey, amountXlm)
      setBalance(newBalance)
      setAmount('')
      const txs = await getTransactions(userId, 20)
      setTransactions(txs)
    } catch (e) {
      console.error(`Savings bank ${mode} failed:`, e)
      setFormError(e instanceof Error ? e.message : (e as { message?: string })?.message || `Couldn’t complete the ${mode}.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-2)', padding: '28px 20px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button onClick={() => nav(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>Savings Bank</h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Deposit XLM and grow a real on-chain balance you can withdraw anytime.
        </p>

        {loadState === 'loading' ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 32 }}>Loading...</div>
        ) : loadState === 'error' ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: 6 }}>Couldn't load your savings</p>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 16 }}>{errorMsg}</p>
            <button onClick={load} className="btn btn-ghost btn-sm">
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Balance card */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'rgba(14,165,233,.1)', border: '1.5px solid rgba(14,165,233,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PiggyBank size={22} color="#0EA5E9" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 2 }}>Saved Balance</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                      {balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>XLM</span>
                  </div>
                </div>
              </div>

              {wallet.isGuest ? (
                <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>
                  Connect a wallet to deposit or withdraw real XLM.
                </p>
              ) : (
                <>
                  {/* Deposit / Withdraw toggle */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <button
                      onClick={() => { setMode('deposit'); setFormError(null) }}
                      className={mode === 'deposit' ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700 }}
                    >
                      <ArrowDownCircle size={14} /> Deposit
                    </button>
                    <button
                      onClick={() => { setMode('withdraw'); setFormError(null) }}
                      className={mode === 'withdraw' ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 700 }}
                    >
                      <ArrowUpCircle size={14} /> Withdraw
                    </button>
                  </div>

                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="Amount in XLM"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setFormError(null) }}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12,
                      border: '1.5px solid var(--border)', fontSize: 15, marginBottom: 10,
                      background: 'var(--surface)', color: 'var(--ink)',
                    }}
                  />

                  {formError && (
                    <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{formError}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{
                      width: '100%', padding: '13px 0', borderRadius: 14, fontSize: 15, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: submitting ? 0.65 : 1,
                    }}
                  >
                    {submitting && <RefreshCw size={15} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />}
                    {submitting ? 'Confirm in your wallet...' : mode === 'deposit' ? 'Deposit XLM' : 'Withdraw XLM'}
                  </button>
                </>
              )}
            </div>

            {/* Transaction history */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 16 }}>
                Recent Activity
              </div>
              {transactions.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'center', padding: '12px 0' }}>
                  No deposits or withdrawals yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {transactions.map(tx => (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {tx.type === 'deposit'
                        ? <ArrowDownCircle size={16} color="#16A34A" strokeWidth={2} />
                        : <ArrowUpCircle size={16} color="#DC2626" strokeWidth={2} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                          {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                          {new Date(tx.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: tx.type === 'deposit' ? '#16A34A' : '#DC2626' }}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount_xlm.toFixed(2)} XLM
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

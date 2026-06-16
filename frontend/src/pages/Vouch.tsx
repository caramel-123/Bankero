import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Users, AlertTriangle, Info } from 'lucide-react'
import type { useWallet } from '../hooks/useWallet'
type WalletHook = ReturnType<typeof useWallet>

export default function Vouch({ wallet: _ }: { wallet: WalletHook }) {
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [stake, setStake] = useState(50)
  const [vouched, setVouched] = useState(false)

  return (
    <div style={{ minHeight:'100vh', background:'var(--surface-2)', fontFamily:"'Outfit',system-ui,sans-serif", padding:32 }}>
      <button onClick={() => nav('/dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:999, border:'1.5px solid var(--border)', background:'var(--surface)', fontSize:14, fontWeight:700, color:'var(--ink)', cursor:'pointer', marginBottom:24 }}>
        <ArrowLeft size={15} strokeWidth={2} /> Back
      </button>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'var(--ink)', marginBottom:4 }}>Community Vouching</h1>
        <p style={{ color:'var(--ink-3)', marginBottom:28, lineHeight:1.6 }}>Stake XLM to vouch for a borrower. Help them build their credit — and earn 1% when they repay.</p>

        {vouched ? (
          <div style={{ background:'var(--green-tint)', borderRadius:20, padding:56, border:'1px solid #BBF7D0', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'#DCFCE7', border:'2px solid #BBF7D0', display:'grid', placeItems:'center', margin:'0 auto 20px' }}>
              <CheckCircle size={32} strokeWidth={1.5} color="#16A34A" />
            </div>
            <h3 style={{ fontSize:18, fontWeight:800, color:'var(--ink)', marginBottom:8 }}>Vouch Submitted</h3>
            <p style={{ color:'var(--ink-3)', marginBottom:20, lineHeight:1.6 }}>Your {stake} XLM stake is locked until the borrower's loan is repaid or defaults.</p>
            <button onClick={() => { setVouched(false); setSearch('') }} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 24px', borderRadius:10, fontSize:14, fontWeight:700, color:'#fff', background:'var(--green)', border:'none', cursor:'pointer' }}>
              <Users size={15} strokeWidth={2} /> Vouch Again
            </button>
          </div>
        ) : (
          <div style={{ background:'var(--surface)', borderRadius:20, padding:28, border:'1px solid var(--border-2)' }}>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:14, fontWeight:700, color:'var(--ink)', display:'block', marginBottom:8 }}>Borrower Wallet Address</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="G... (Stellar wallet address)" style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1.5px solid var(--border)', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:14, fontWeight:700, color:'var(--ink)', display:'block', marginBottom:8 }}>Stake Amount (XLM)</label>
              <div style={{ display:'flex', gap:8 }}>
                {[50,100,250,500].map(s => (
                  <button key={s} onClick={() => setStake(s)} style={{ flex:1, padding:'10px 0', borderRadius:10, border:`2px solid ${stake===s ? '#16A34A' : '#E2E8F0'}`, background: stake===s ? '#F0FDF4' : '#fff', color: stake===s ? '#16A34A' : '#6B7280', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:7, fontSize:12, color:'var(--ink-4)' }}>
                <Info size={12} strokeWidth={2} /> Minimum 50 XLM. Stake is slashed if borrower defaults.
              </div>
            </div>
            <div style={{ display:'flex', gap:10, padding:14, borderRadius:12, background:'var(--amber-tint)', border:'1px solid #FDE68A', marginBottom:20 }}>
              <AlertTriangle size={15} strokeWidth={2} color="#F59E0B" style={{ flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:13, color:'#92400E', margin:0, lineHeight:1.5 }}>You earn <strong>1% of the repayment</strong> (~{(stake * 0.01 * 1.05).toFixed(2)} XLM) if borrower repays. If they default, your stake is slashed to the lender.</p>
            </div>
            <button onClick={() => search.length > 10 && setVouched(true)} disabled={search.length < 10} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'14px 0', borderRadius:12, fontSize:15, fontWeight:700, color:'#fff', background: search.length > 10 ? '#16A34A' : '#CBD5E1', border:'none', cursor: search.length > 10 ? 'pointer' : 'not-allowed' }}>
              <Users size={16} strokeWidth={2} /> Stake &amp; Vouch
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

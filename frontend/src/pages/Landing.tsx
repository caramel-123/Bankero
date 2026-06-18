import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Wallet, TrendingUp, Users, ShieldCheck, ArrowRight,
  Zap, BarChart2, ChevronRight, Star, Smartphone, X,
} from 'lucide-react'

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }
const stagger = { show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } } }

/* ── Score preview card (isolated so stagger class works) ── */
function ScoreCard() {
  const factors = [
    { label: 'Loan Repayment', pct: 88, color: 'var(--green-soft)' },
    { label: 'Transactions',   pct: 64, color: '#60A5FA' },
    { label: 'Community Trust',pct: 50, color: 'var(--amber)' },
    { label: 'Remittance',     pct: 42, color: '#A78BFA' },
  ]
  return (
    <div style={{
      background: 'var(--panel)',
      borderRadius: 'var(--r-2xl)',
      padding: '28px 26px',
      boxShadow: '0 24px 64px rgba(17,26,21,.32)',
      position: 'relative',
      overflow: 'hidden',
      width: 300,
      flexShrink: 0,
    }}>
      {/* glow accent */}
      <div style={{
        position: 'absolute', top: -60, right: -40,
        width: 220, height: 220, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,.2) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 12 }}>
        Credit Score
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 10 }}>
        <span className="score-num" style={{ fontSize: 80, color: '#fff' }}>725</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--r-full)', background: 'var(--green)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
            Good
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--r-full)', background: 'rgba(34,197,94,.15)', color: 'var(--panel-hi)', fontSize: 12, fontWeight: 700 }}>
            <TrendingUp size={11} strokeWidth={2.5} /> +12 pts
          </span>
        </div>
      </div>

      <div className="progress-track" style={{ marginBottom: 6 }}>
        <div className="progress-fill" style={{ width: '78%', background: 'linear-gradient(90deg, var(--green-soft), var(--panel-hi))' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', marginBottom: 20 }}>
        <span>300</span><span>850</span>
      </div>

      {factors.map(f => (
        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', flex: 1 }}>{f.label}</span>
          <div style={{ width: 72, height: 4, borderRadius: 'var(--r-full)', background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
            <div style={{ width: `${f.pct}%`, height: '100%', background: f.color, borderRadius: 'var(--r-full)' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.5)', width: 26, textAlign: 'right' }}>{f.pct}%</span>
        </div>
      ))}
    </div>
  )
}

function MobilePreview({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -12, right: -12, zIndex: 1,
            width: 32, height: 32, borderRadius: '50%',
            background: '#fff', border: 'none', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,.25)',
          }}
        >
          <X size={15} strokeWidth={2.5} color="#111" />
        </button>

        {/* phone shell */}
        <div style={{
          width: 375, height: 720,
          border: '8px solid #1a1a1a',
          borderRadius: 48,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,.6)',
          background: 'var(--surface)',
          position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* notch */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 120, height: 28, background: '#1a1a1a',
            borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
            zIndex: 2,
          }} />

          {/* mobile nav */}
          <div style={{ padding: '36px 20px 12px', borderBottom: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--panel)', display: 'grid', placeItems: 'center' }}>
                <span style={{ color: 'var(--green-soft)', fontWeight: 900, fontSize: 12 }}>₱</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Bank<span style={{ color: 'var(--green)' }}>e</span>ro</span>
            </div>
            <button onClick={() => nav('/login')} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 14px' }}>
              Get Started
            </button>
          </div>

          {/* mobile hero */}
          <div style={{ padding: '28px 20px 0', flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--r-full)', background: 'var(--green-tint)', border: '1px solid var(--green-border)', marginBottom: 18 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green-soft)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-hi)' }}>Live on Stellar Testnet</span>
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 14, fontFamily: 'var(--font)' }}>
              Your financial<br />reputation,<br /><span style={{ color: 'var(--green)' }}>on-chain.</span>
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 24 }}>
              No bank account? No credit history? Bankero gives unbanked Filipinos a verifiable credit score.
            </p>
            <button onClick={() => nav('/login')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px' }}>
              Build your score →
            </button>
            <button onClick={() => nav('/login?role=lender')} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 14, marginTop: 10 }}>
              Lender access
            </button>

            {/* mini score card */}
            <div style={{ marginTop: 28, background: 'var(--panel)', borderRadius: 20, padding: '20px', boxShadow: '0 8px 32px rgba(17,26,21,.25)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>Credit Score</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 56, fontWeight: 900, color: '#fff', lineHeight: 1 }}>725</span>
                <span style={{ padding: '3px 10px', borderRadius: 'var(--r-full)', background: 'var(--green)', color: '#fff', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Good</span>
              </div>
              <div style={{ height: 4, borderRadius: 'var(--r-full)', background: 'rgba(255,255,255,.1)', marginBottom: 14, overflow: 'hidden' }}>
                <div style={{ width: '78%', height: '100%', background: 'linear-gradient(90deg,var(--green-soft),var(--panel-hi))' }} />
              </div>
              {[['Loan Repayment','88%','var(--green-soft)'],['Transactions','64%','#60A5FA'],['Community Trust','50%','var(--amber)'],['Remittance','42%','#A78BFA']].map(([label,pct,color])=>(
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', flex: 1 }}>{label}</span>
                  <div style={{ width: 56, height: 3, borderRadius: 'var(--r-full)', background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                    <div style={{ width: pct, height: '100%', background: color }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', width: 24, textAlign: 'right' }}>{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
          Click outside to close
        </p>
      </div>
    </div>
  )
}

export default function Landing() {
  const nav = useNavigate()
  const [showMobile, setShowMobile] = useState(false)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', fontFamily: 'var(--font)' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 'var(--z-sticky)' as any,
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 64,
        background: 'rgba(255,255,255,.82)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-2)',
        transition: 'border-color 200ms var(--ease-out)',
      }}>
        <button
          onClick={() => nav('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--panel)', display: 'grid', placeItems: 'center' }}>
            <span style={{ color: 'var(--green-soft)', fontWeight: 900, fontSize: 15 }}>₱</span>
          </div>
          <span className="heading" style={{ fontSize: 18 }}>
            Bank<span style={{ color: 'var(--green)' }}>e</span>ro
          </span>
        </button>

        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto', marginRight: 20 }}>
          {['How it works', 'For Lenders'].map(l => (
            <button key={l} className="btn btn-sm" style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontWeight: 500, borderRadius: 'var(--r-full)', padding: '7px 14px', fontSize: 14 }}>
              {l}
            </button>
          ))}
        </div>

        <button onClick={() => nav('/login')} className="btn btn-primary btn-sm">
          <Wallet size={14} strokeWidth={2} /> Get Started
        </button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1160, margin: '0 auto',
        padding: '136px 40px 100px',
        display: 'flex', alignItems: 'center',
        gap: 80,
      }}>
        {/* Left copy — motion stagger */}
        <motion.div
          style={{ flex: 1 }}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 12px', borderRadius: 'var(--r-full)',
              background: 'var(--green-tint)', border: '1px solid var(--green-border)',
              marginBottom: 28,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green-soft)', animation: 'pulse-dot 2s ease infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-hi)' }}>Live on Stellar Testnet</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.55, ease: EASE_OUT }}
            className="display"
            style={{ fontSize: 'clamp(42px, 5.5vw, 72px)', color: 'var(--ink)', marginBottom: 24 }}
          >
            Your financial<br />
            reputation,<br />
            <span style={{ color: 'var(--green)' }}>on-chain.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--ink-3)', maxWidth: '50ch', marginBottom: 36 }}
          >
            No bank account? No credit history? Bankero gives unbanked Filipinos a verifiable credit score — so you can access micro-loans and grow your financial life.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
          >
            <button onClick={() => nav('/login')} className="btn btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
              Build your score <ArrowRight size={16} strokeWidth={2.5} />
            </button>
            <button onClick={() => nav('/login?role=lender')} className="btn btn-ghost" style={{ fontSize: 16 }}>
              Lender access
            </button>
          </motion.div>

          {/* Trust line */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 40, flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={15} strokeWidth={2} color="var(--green)" />
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Soroban smart contracts</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={15} strokeWidth={2} color="var(--amber)" />
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>300–850 score range</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={15} strokeWidth={2} color="#60A5FA" />
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>₱500–₱10,000 loans</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Score card — offset right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28, ease: EASE_OUT }}
          style={{ flexShrink: 0 }}
        >
          <ScoreCard />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-2)',
        borderBottom: '1px solid var(--border-2)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 40px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 80, alignItems: 'start' }}>
          {/* Left label */}
          <div>
            <h2 className="heading" style={{ fontSize: 'clamp(32px, 3.5vw, 46px)', color: 'var(--ink)', marginBottom: 16 }}>
              From zero to creditworthy.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: '36ch' }}>
              Three actions are all it takes to start building a financial reputation that's owned by you.
            </p>
          </div>

          {/* Steps — NOT 3 identical cards. Stacked list with connectors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { num: '01', icon: <Wallet size={20} strokeWidth={2} />, title: 'Connect your Stellar wallet', desc: 'Link Freighter in seconds. Your wallet address is your financial identity — no ID required, no paperwork.' },
              { num: '02', icon: <TrendingUp size={20} strokeWidth={2} />, title: 'Build your score', desc: 'Your 300–850 score grows with every on-time repayment, community vouch, wallet transaction, and remittance record.' },
              { num: '03', icon: <Zap size={20} strokeWidth={2} />, title: 'Access micro-loans', desc: 'Higher score = higher limit. Borrow up to ₱10,000 at a flat 5% rate with 7, 14, or 30-day terms.' },
            ].map((s, i) => (
              <div key={s.num} style={{
                display: 'flex', gap: 24, paddingBottom: i < 2 ? 36 : 0,
                borderBottom: i < 2 ? '1px solid var(--border-2)' : 'none',
                paddingTop: i > 0 ? 36 : 0,
              }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--r-xl)',
                    background: 'var(--panel)', display: 'grid', placeItems: 'center',
                    color: 'var(--panel-hi)',
                  }}>
                    {s.icon}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', letterSpacing: '.06em' }}>{s.num}</span>
                  <h3 className="heading" style={{ fontSize: 18, color: 'var(--ink)', margin: '4px 0 8px' }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — asymmetric 2-col ─────────────────────── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* Large feature left */}
          <div className="card hover-lift" style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 20, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--r-xl)', background: 'var(--green-tint)', display: 'grid', placeItems: 'center', color: 'var(--green)' }}>
              <ShieldCheck size={24} strokeWidth={2} />
            </div>
            <div>
              <h3 className="heading" style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 10 }}>On-chain & verifiable</h3>
              <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.65 }}>
                Your score lives on Stellar — immutable, transparent, and owned by you. No bank can close your account. No algorithm is hidden. Every factor is auditable by anyone.
              </p>
            </div>
            <button onClick={() => nav('/login')} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
              See how it works <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Right column — 2 stacked smaller */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card hover-lift" style={{ padding: 28, display: 'flex', gap: 18, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'var(--amber-tint)', display: 'grid', placeItems: 'center', color: 'var(--amber)', flexShrink: 0 }}>
                <Users size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="heading" style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>Community vouching</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>Stake XLM to vouch for trusted borrowers. Your social trust translates directly to their credit score.</p>
              </div>
            </div>

            <div className="card hover-lift" style={{ padding: 28, display: 'flex', gap: 18, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'var(--green-tint)', display: 'grid', placeItems: 'center', color: 'var(--green)', flexShrink: 0 }}>
                <BarChart2 size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="heading" style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>4-factor scoring</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>Repayment history (40%), transactions (25%), community trust (20%), and remittance data (15%) — all weighted and transparent.</p>
              </div>
            </div>

            <div className="card hover-lift" style={{ padding: 28, display: 'flex', gap: 18, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: '#EFF6FF', display: 'grid', placeItems: 'center', color: '#3B82F6', flexShrink: 0 }}>
                <Zap size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="heading" style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>Instant disbursement</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>Approved loans go directly to your Stellar wallet in seconds — no queues, no bank visits.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px 96px' }}>
        <div className="panel-card" style={{ padding: '60px 64px', display: 'flex', alignItems: 'center', gap: 56 }}>
          {/* bg glow */}
          <div style={{
            position: 'absolute', top: -80, right: -60,
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ flex: 1, position: 'relative' }}>
            <h2 className="heading" style={{ fontSize: 'clamp(26px, 3vw, 38px)', color: '#fff', marginBottom: 12 }}>
              Ready to build your financial future?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
              Connect your Stellar wallet in under 2 minutes. Free forever for borrowers.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexShrink: 0, position: 'relative' }}>
            <button onClick={() => nav('/login')} className="btn btn-primary">
              <Wallet size={16} strokeWidth={2} /> Connect Wallet
            </button>
            <button
              onClick={() => nav('/login?role=lender')}
              className="btn"
              style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.85)', border: '1px solid rgba(255,255,255,.15)', padding: '13px 22px', fontSize: 15 }}
            >
              Lender Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── MOBILE PREVIEW BUTTON ────────────────────────────── */}
      <button
        onClick={() => setShowMobile(true)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px',
          background: 'var(--panel)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 'var(--r-full)',
          cursor: 'pointer',
          fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,.35)',
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Smartphone size={16} strokeWidth={2} />
        View Mobile
      </button>

      {showMobile && <MobilePreview onClose={() => setShowMobile(false)} />}

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border-2)',
        padding: '28px 40px',
        display: 'flex', alignItems: 'center',
        maxWidth: 1160, margin: '0 auto',
      }}>
        <span className="heading" style={{ fontSize: 16 }}>
          Bank<span style={{ color: 'var(--green)' }}>e</span>ro
        </span>
        <p style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-4)' }}>
          © 2026 Bankero · Built on Stellar / Soroban · Testnet
        </p>
      </footer>
    </div>
  )
}

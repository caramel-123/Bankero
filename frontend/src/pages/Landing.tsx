import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import {
  Wallet, TrendingUp, Users, ShieldCheck, ArrowRight,
  Zap, BarChart2, ChevronRight, Star, MessageSquare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatWallet } from '../lib/stellar'

const HERO_VIDEO = 'https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4'

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

interface FeedbackRow {
  id: string
  display_name: string
  rating: number
  message: string
  is_guest: boolean
  created_at: string
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={13} fill={n <= rating ? '#F59E0B' : 'none'} color={n <= rating ? '#F59E0B' : 'rgba(255,255,255,.2)'} strokeWidth={1.5} />
      ))}
    </div>
  )
}

function TestimonialsSection() {
  const [items, setItems] = useState<FeedbackRow[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(9)
      .then(({ data }) => { setItems((data ?? []) as FeedbackRow[]); setLoaded(true) })
  }, [])

  const displayName = (f: FeedbackRow) => {
    if (f.is_guest || !f.display_name || f.display_name === 'Guest') return 'Guest User'
    // if it looks like a stellar address (long), truncate it
    if (f.display_name.length > 20) return formatWallet(f.display_name)
    return f.display_name
  }

  return (
    <section style={{ background: 'var(--surface-2)', padding: '80px 0' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(22,163,74,.1)', border: '1px solid rgba(22,163,74,.2)', marginBottom: 16 }}>
            <MessageSquare size={14} color="var(--green)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>User Reviews</span>
          </div>
          <h2 className="heading" style={{ fontSize: 'clamp(24px, 3vw, 36px)', color: 'var(--ink)', marginBottom: 12 }}>
            What Users Are Saying
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', maxWidth: 480, margin: '0 auto' }}>
            Real feedback from borrowers and community members using Bankero.
          </p>
        </div>

        {/* Cards */}
        {!loaded ? (
          <div style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px 0' }}>Loading reviews...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 16, background: 'var(--surface)', border: '1.5px dashed var(--border)' }}>
            <MessageSquare size={32} color="var(--ink-4)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--ink-3)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No reviews yet</p>
            <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>Be the first to leave feedback after using Bankero.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {items.map(f => (
              <div key={f.id} style={{
                background: 'var(--surface)',
                borderRadius: 16,
                padding: '24px',
                border: '1.5px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,.04)',
              }}>
                <StarRow rating={f.rating} />
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.75, flex: 1, fontStyle: 'italic' }}>
                  "{f.message}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border-2)' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: f.is_guest ? 'var(--surface-3)' : '#DCFCE7',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Wallet size={14} color={f.is_guest ? 'var(--ink-4)' : '#16A34A'} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'monospace' }}>
                      {displayName(f)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
                      {f.is_guest ? 'Guest' : 'Verified Wallet'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function Landing({ connectAsGuest }: { connectAsGuest: () => void }) {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 60) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.target.classList.toggle('in', e.isIntersecting)),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface)', fontFamily: 'var(--font)' }}>

      <style>{`
        @keyframes heroBlurUp {
          from { opacity: 0; filter: blur(18px); transform: translateY(32px); }
          to   { opacity: 1; filter: blur(0);    transform: translateY(0); }
        }
        .hero-blur-up {
          animation: heroBlurUp 0.9s cubic-bezier(0.23,1,0.32,1) both;
          opacity: 0;
        }
        @keyframes scrollFade {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .reveal {
          opacity: 0;
          filter: blur(14px);
          transform: translateY(28px);
          transition: opacity 0.72s cubic-bezier(0.23,1,0.32,1),
                      filter  0.72s cubic-bezier(0.23,1,0.32,1),
                      transform 0.72s cubic-bezier(0.23,1,0.32,1);
        }
        .reveal.in {
          opacity: 1;
          filter: blur(0);
          transform: translateY(0);
        }
      `}</style>

      {/* ── NAV — dark glass over video, fades to white on scroll ── */}
      <nav className="landing-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center',
        padding: '0 40px', height: 64,
        background: scrolled ? 'rgba(255,255,255,.92)' : 'rgba(0,0,0,.15)',
        backdropFilter: 'blur(20px)',
        borderBottom: scrolled ? '1px solid var(--border-2)' : '1px solid rgba(255,255,255,.08)',
        transition: 'background 400ms ease, border-color 400ms ease',
      }}>
        <button
          onClick={() => nav('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/bankero-logo.png" alt="Bankero" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'contain' }} />
          <span className="heading" style={{ fontSize: 18, color: scrolled ? 'var(--ink)' : '#fff', transition: 'color 400ms ease' }}>
            Bank<span style={{ color: scrolled ? 'var(--green)' : 'var(--green-soft)' }}>e</span>ro
          </span>
        </button>

        <div className="landing-nav-links" style={{ display: 'flex', gap: 2, marginLeft: 'auto', marginRight: 20 }}>
          {['How it works', 'For Lenders'].map(l => (
            <button key={l} className="btn btn-sm" style={{ background: 'none', border: 'none', color: scrolled ? 'var(--ink-3)' : 'rgba(255,255,255,.7)', fontWeight: 500, borderRadius: 'var(--r-full)', padding: '7px 14px', fontSize: 14, transition: 'color 400ms ease' }}>
              {l}
            </button>
          ))}
        </div>

        <button onClick={() => nav('/login')} className="btn btn-primary btn-sm">
          <Wallet size={14} strokeWidth={2} /> Get Started
        </button>
      </nav>

      {/* ── HERO — full-screen Cloudinary cloud video ── */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* Video bg */}
        <video
          autoPlay loop muted playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>

        {/* Cinematic vignette — darkens edges + bottom */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, rgba(0,0,0,.5) 100%),
            linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,.6) 60%, rgba(0,0,0,.88) 100%)
          `,
        }} />

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1160, width: '100%', margin: '0 auto', padding: '0 40px', display: 'flex', alignItems: 'center', gap: 80 }}>

          {/* Left — white text, staggered blur-fade-up */}
          <div style={{ flex: 1 }}>
            <div className="hero-blur-up" style={{ animationDelay: '150ms',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', borderRadius: 'var(--r-full)',
              background: 'rgba(34,197,94,.2)', border: '1px solid rgba(34,197,94,.4)',
              marginBottom: 28,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green-soft)', animation: 'pulse-dot 2s ease infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80' }}>Live on Stellar Testnet</span>
            </div>

            <h1 className="hero-blur-up display" style={{
              animationDelay: '300ms',
              fontSize: 'clamp(42px, 5.5vw, 72px)', color: '#fff', marginBottom: 24,
              textShadow: '0 2px 40px rgba(0,0,0,.4)',
            }}>
              Your financial<br />
              reputation,<br />
              <span style={{ color: '#4ADE80' }}>on-chain.</span>
            </h1>

            <p className="hero-blur-up" style={{
              animationDelay: '450ms',
              fontSize: 17, lineHeight: 1.65, color: 'rgba(255,255,255,.72)', maxWidth: '50ch', marginBottom: 36,
            }}>
              No bank account? No credit history? Bankero gives unbanked Filipinos a verifiable credit score — so you can access micro-loans and grow your financial life.
            </p>

            <div className="hero-blur-up" style={{ animationDelay: '600ms', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => nav('/login')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '14px 32px', borderRadius: 'var(--r-full)',
                  background: 'rgba(34,197,94,.22)',
                  border: '1.5px solid rgba(74,222,128,.55)',
                  backdropFilter: 'blur(14px) saturate(1.6)',
                  WebkitBackdropFilter: 'blur(14px) saturate(1.6)',
                  boxShadow: '0 4px 28px rgba(34,197,94,.25), inset 0 1px 0 rgba(255,255,255,.18)',
                  color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  textShadow: '0 1px 8px rgba(0,0,0,.35)',
                  transition: 'background 200ms ease, box-shadow 200ms ease',
                }}
              >
                Build your score <ArrowRight size={16} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => { connectAsGuest(); nav('/dashboard') }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 'var(--r-full)',
                  background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.18)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  color: 'rgba(255,255,255,.8)', fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 200ms ease',
                }}
              >
                Try as Guest
              </button>
            </div>

            {/* Trust pills */}
            <div className="hero-blur-up" style={{ animationDelay: '750ms', display: 'flex', alignItems: 'center', gap: 20, marginTop: 40, flexWrap: 'wrap' }}>
              {[
                { icon: <ShieldCheck size={14} strokeWidth={2} />, text: 'Soroban smart contracts' },
                { icon: <Star size={14} strokeWidth={2} />, text: '300–850 score range' },
                { icon: <Zap size={14} strokeWidth={2} />, text: '₱500–₱10,000 loans' },
              ].map(({ icon, text }, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                  <span style={{ color: 'rgba(255,255,255,.45)' }}>{icon}</span>
                  {text}
                  {i < 2 && <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.2)', marginLeft: 12, display: 'inline-block' }} />}
                </span>
              ))}
            </div>
          </div>

          {/* Score card — right side, already dark-themed */}
          <div className="hero-blur-up landing-hero-card" style={{ animationDelay: '400ms', flexShrink: 0 }}>
            <ScoreCard />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="hero-blur-up" style={{ animationDelay: '900ms', position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)' }}>Scroll</span>
          <div style={{ width: 1, height: 32, background: 'linear-gradient(180deg, rgba(255,255,255,.4), transparent)', animation: 'scrollFade 2s ease infinite' }} />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section style={{
        background: 'var(--surface-2)',
        borderTop: '1px solid var(--border-2)',
        borderBottom: '1px solid var(--border-2)',
      }}>
        <div className="landing-steps" style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 40px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 80, alignItems: 'start' }}>
          {/* Left label */}
          <div className="reveal">
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
              <div key={s.num} className="reveal" style={{
                transitionDelay: `${i * 100}ms`,
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
        <div className="landing-features" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* Large feature left */}
          <div className="card hover-lift reveal" style={{ padding: 36, display: 'flex', flexDirection: 'column', gap: 20, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
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
            <div className="card hover-lift reveal" style={{ transitionDelay: '100ms', padding: 28, display: 'flex', gap: 18, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'var(--amber-tint)', display: 'grid', placeItems: 'center', color: 'var(--amber)', flexShrink: 0 }}>
                <Users size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="heading" style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>Community vouching</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>Stake XLM to vouch for trusted borrowers. Your social trust translates directly to their credit score.</p>
              </div>
            </div>

            <div className="card hover-lift reveal" style={{ transitionDelay: '200ms', padding: 28, display: 'flex', gap: 18, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: 'var(--green-tint)', display: 'grid', placeItems: 'center', color: 'var(--green)', flexShrink: 0 }}>
                <BarChart2 size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="heading" style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>4-factor scoring</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>Repayment history (40%), transactions (25%), community trust (20%), and remittance data (15%) — all weighted and transparent.</p>
              </div>
            </div>

            <div className="card hover-lift reveal" style={{ transitionDelay: '300ms', padding: 28, display: 'flex', gap: 18, transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)' }}>
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

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px 96px' }}>
        <div className="panel-card landing-cta reveal" style={{ padding: '60px 64px', display: 'flex', alignItems: 'center', gap: 56 }}>
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

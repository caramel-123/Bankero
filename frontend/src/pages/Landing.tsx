import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import {
  Wallet, TrendingUp, Users, ShieldCheck, ArrowRight,
  Zap, BarChart2, ChevronRight, Star, MessageSquare,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatWallet } from '../lib/stellar'

const HERO_VIDEO = 'https://res.cloudinary.com/dfonotyfb/video/upload/v1775585556/dds3_1_rqhg7x.mp4'
const GALAXY_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4'

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
        <Star key={n} size={13} fill={n <= rating ? '#F59E0B' : 'rgba(255,255,255,.1)'} color={n <= rating ? '#F59E0B' : 'rgba(255,255,255,.2)'} strokeWidth={1.5} />
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
    <section style={{ borderTop: '1px solid rgba(255,255,255,.07)', padding: '80px 0' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px' }}>

        {/* Header */}
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(74,222,128,.3)', marginBottom: 16 }}>
            <MessageSquare size={14} color="#4ADE80" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80' }}>User Reviews</span>
          </div>
          <h2 className="heading" style={{ fontSize: 'clamp(24px, 3vw, 36px)', color: '#fff', marginBottom: 12 }}>
            What Users Are Saying
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', maxWidth: 480, margin: '0 auto' }}>
            Real feedback from borrowers and community members using Bankero.
          </p>
        </div>

        {/* Cards */}
        {!loaded ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', padding: '40px 0' }}>Loading reviews...</div>
        ) : items.length === 0 ? (
          <div className="reveal" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 16, background: 'rgba(255,255,255,.05)', border: '1.5px dashed rgba(255,255,255,.15)' }}>
            <MessageSquare size={32} color="rgba(255,255,255,.3)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No reviews yet</p>
            <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 14 }}>Be the first to leave feedback after using Bankero.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {items.map(f => (
              <div key={f.id} className="lg reveal" style={{
                borderRadius: 18, padding: '24px',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <StarRow rating={f.rating} />
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.75, flex: 1, fontStyle: 'italic' }}>
                  "{f.message}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: f.is_guest ? 'rgba(255,255,255,.08)' : 'rgba(34,197,94,.18)',
                    border: `1px solid ${f.is_guest ? 'rgba(255,255,255,.12)' : 'rgba(74,222,128,.3)'}`,
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Wallet size={14} color={f.is_guest ? 'rgba(255,255,255,.4)' : '#4ADE80'} strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                      {displayName(f)}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>
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
    <div style={{ minHeight: '100dvh', background: 'transparent', fontFamily: 'var(--font)', color: '#fff', position: 'relative' }}>

      {/* ── GALAXY — fixed full-page background ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
        <video autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.6)', transformOrigin: '50% 40%' }}>
          <source src={GALAXY_VIDEO} type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      </div>

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
        /* ── Liquid-glass (from cinematic-cloud template) ── */
        .lg {
          background: rgba(255,255,255,0.06);
          background-blend-mode: luminosity;
          backdrop-filter: blur(20px) saturate(1.8);
          -webkit-backdrop-filter: blur(20px) saturate(1.8);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.18), 0 6px 32px rgba(0,0,0,0.35);
          position: relative;
          overflow: hidden;
        }
        .lg::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0.45) 0%,
            rgba(255,255,255,0.15) 20%,
            rgba(255,255,255,0)    40%,
            rgba(255,255,255,0)    60%,
            rgba(255,255,255,0.15) 80%,
            rgba(255,255,255,0.45) 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .lg-green {
          background: rgba(34,197,94,0.12);
          background-blend-mode: luminosity;
          backdrop-filter: blur(20px) saturate(1.8);
          -webkit-backdrop-filter: blur(20px) saturate(1.8);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.2), 0 6px 32px rgba(34,197,94,0.18);
          position: relative;
          overflow: hidden;
        }
        .lg-green::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(
            180deg,
            rgba(74,222,128,0.6)  0%,
            rgba(74,222,128,0.2)  20%,
            rgba(74,222,128,0)    40%,
            rgba(74,222,128,0)    60%,
            rgba(74,222,128,0.2)  80%,
            rgba(74,222,128,0.5)  100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
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
        background: 'rgba(0,0,0,.35)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        transition: 'background 400ms ease, border-color 400ms ease',
      }}>
        <button
          onClick={() => nav('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <img src="/bankero-logo.png" alt="Bankero" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'contain' }} />
          <span className="heading" style={{ fontSize: 18, color: '#fff' }}>
            Bank<span style={{ color: 'var(--green-soft)' }}>e</span>ro
          </span>
        </button>

        <div className="landing-nav-links" style={{ display: 'flex', gap: 2, marginLeft: 'auto', marginRight: 20 }}>
          {['How it works', 'For Lenders'].map(l => (
            <button key={l} className="btn btn-sm" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontWeight: 500, borderRadius: 'var(--r-full)', padding: '7px 14px', fontSize: 14 }}>
              {l}
            </button>
          ))}
        </div>

        <button onClick={() => nav('/login')} className="lg-green" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '9px 20px', borderRadius: 'var(--r-full)',
          color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
        }}>
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
            <div className="hero-blur-up lg-green" style={{ animationDelay: '150ms',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', borderRadius: 'var(--r-full)',
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
              <button onClick={() => nav('/login')} className="lg-green" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '14px 32px', borderRadius: 'var(--r-full)',
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: 'none',
              }}>
                Build your score <ArrowRight size={16} strokeWidth={2.5} />
              </button>
              <button onClick={() => { connectAsGuest(); nav('/dashboard') }} className="lg" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 'var(--r-full)',
                color: 'rgba(255,255,255,.85)', fontSize: 16, fontWeight: 600, cursor: 'pointer', border: 'none',
              }}>
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
      <section style={{ borderTop: '1px solid rgba(255,255,255,.07)', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '80px 0' }}>
        <div className="landing-steps" style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 80, alignItems: 'start' }}>
          <div className="reveal">
            <h2 className="heading" style={{ fontSize: 'clamp(32px, 3.5vw, 46px)', color: '#fff', marginBottom: 16 }}>
              From zero to creditworthy.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.5)', lineHeight: 1.6, maxWidth: '36ch' }}>
              Three actions are all it takes to start building a financial reputation that's owned by you.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { num: '01', icon: <Wallet size={20} strokeWidth={2} />, title: 'Connect your Stellar wallet', desc: 'Link Freighter in seconds. Your wallet address is your financial identity — no ID required, no paperwork.' },
              { num: '02', icon: <TrendingUp size={20} strokeWidth={2} />, title: 'Build your score', desc: 'Your 300–850 score grows with every on-time repayment, community vouch, wallet transaction, and remittance record.' },
              { num: '03', icon: <Zap size={20} strokeWidth={2} />, title: 'Access micro-loans', desc: 'Higher score = higher limit. Borrow up to ₱10,000 at a flat 5% rate with 7, 14, or 30-day terms.' },
            ].map((s, i) => (
              <div key={s.num} className="lg reveal" style={{
                transitionDelay: `${i * 120}ms`,
                display: 'flex', gap: 20, padding: '24px 28px',
                borderRadius: 18, marginBottom: i < 2 ? 16 : 0,
              }}>
                <div style={{ flexShrink: 0 }}>
                  <div className="lg-green" style={{
                    width: 44, height: 44, borderRadius: 'var(--r-xl)',
                    display: 'grid', placeItems: 'center', color: '#4ADE80',
                  }}>
                    {s.icon}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', letterSpacing: '.06em' }}>{s.num}</span>
                  <h3 className="heading" style={{ fontSize: 18, color: '#fff', margin: '4px 0 8px' }}>{s.title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — asymmetric 2-col ─────────────────────── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 40px' }}>
        <div className="landing-features" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Large feature left */}
          <div className="lg hover-lift reveal" style={{
            padding: 36, display: 'flex', flexDirection: 'column', gap: 20,
            borderRadius: 20, transition: 'transform 200ms var(--ease-out)',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--r-xl)', background: 'rgba(34,197,94,.18)', border: '1px solid rgba(74,222,128,.3)', display: 'grid', placeItems: 'center', color: '#4ADE80' }}>
              <ShieldCheck size={24} strokeWidth={2} />
            </div>
            <div>
              <h3 className="heading" style={{ fontSize: 22, color: '#fff', marginBottom: 10 }}>On-chain & verifiable</h3>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.65 }}>
                Your score lives on Stellar — immutable, transparent, and owned by you. No bank can close your account. No algorithm is hidden. Every factor is auditable by anyone.
              </p>
            </div>
            <button onClick={() => nav('/login')} className="lg-green" style={{
              alignSelf: 'flex-start', marginTop: 'auto',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 'var(--r-full)',
              color: '#4ADE80', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
            }}>
              See how it works <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Right column — 3 stacked smaller */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: <Users size={20} strokeWidth={2} />, color: '#F59E0B', bg: 'rgba(245,158,11,.15)', border: 'rgba(245,158,11,.3)', title: 'Community vouching', desc: 'Stake XLM to vouch for trusted borrowers. Your social trust translates directly to their credit score.', delay: '100ms' },
              { icon: <BarChart2 size={20} strokeWidth={2} />, color: '#4ADE80', bg: 'rgba(34,197,94,.15)', border: 'rgba(74,222,128,.3)', title: '4-factor scoring', desc: 'Repayment history (40%), transactions (25%), community trust (20%), and remittance data (15%) — all weighted and transparent.', delay: '200ms' },
              { icon: <Zap size={20} strokeWidth={2} />, color: '#60A5FA', bg: 'rgba(96,165,250,.15)', border: 'rgba(96,165,250,.3)', title: 'Instant disbursement', desc: 'Approved loans go directly to your Stellar wallet in seconds — no queues, no bank visits.', delay: '300ms' },
            ].map(f => (
              <div key={f.title} className="lg hover-lift reveal" style={{
                transitionDelay: f.delay, padding: 24, display: 'flex', gap: 18,
                borderRadius: 18, transition: 'transform 200ms var(--ease-out)',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: f.bg, border: `1px solid ${f.border}`, display: 'grid', placeItems: 'center', color: f.color, flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="heading" style={{ fontSize: 17, color: '#fff', marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <TestimonialsSection />

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px 96px' }}>
        <div className="lg-green reveal" style={{
          padding: '60px 64px', display: 'flex', alignItems: 'center', gap: 56, borderRadius: 24,
        }}>
          <div style={{
            position: 'absolute', top: -100, right: -80, width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,.2) 0%, transparent 70%)', pointerEvents: 'none',
          }} />
          <div style={{ flex: 1, position: 'relative' }}>
            <h2 className="heading" style={{ fontSize: 'clamp(26px, 3vw, 38px)', color: '#fff', marginBottom: 12 }}>
              Ready to build your financial future?
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
              Connect your Stellar wallet in under 2 minutes. Free forever for borrowers.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0, position: 'relative', flexWrap: 'wrap' }}>
            <button onClick={() => nav('/login')} className="lg-green" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 'var(--r-full)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none',
            }}>
              <Wallet size={16} strokeWidth={2} /> Connect Wallet
            </button>
            <button onClick={() => nav('/login?role=lender')} className="lg" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 'var(--r-full)',
              color: 'rgba(255,255,255,.85)', fontSize: 15, fontWeight: 600, cursor: 'pointer', border: 'none',
            }}>
              Lender Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,.08)',
        padding: '28px 40px',
        display: 'flex', alignItems: 'center',
        maxWidth: 1160, margin: '0 auto',
      }}>
        <span className="heading" style={{ fontSize: 16, color: '#fff' }}>
          Bank<span style={{ color: '#4ADE80' }}>e</span>ro
        </span>
        <p style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
          © 2026 Bankero · Built on Stellar / Soroban · Testnet
        </p>
      </footer>
    </div>
  )
}

import { useState } from 'react'
import { Star, X, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  walletAddress: string | null
  isGuest: boolean
  onClose: () => void
}

export default function FeedbackModal({ walletAddress, isGuest, onClose }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating || !name.trim() || !message.trim()) return
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('feedback').insert({
        display_name: name.trim(),
        wallet_address: isGuest ? null : walletAddress,
        rating,
        message: message.trim(),
        is_guest: isGuest,
      })
      if (err) throw new Error(err.message)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'May error. Subukan muli.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--panel)', borderRadius: 'var(--r-2xl)',
          padding: '28px 24px', maxWidth: 400, width: '100%',
          border: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Mag-iwan ng Feedback</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <p style={{ color: '#4ade80', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Salamat sa iyong feedback!</p>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14 }}>Makikita ito sa aming landing page.</p>
            <button onClick={onClose} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Isara
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Star rating */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.45)', display: 'block', marginBottom: 10 }}>
                Rating mo (1–5 bituin)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'transform 120ms' }}
                  >
                    <Star
                      size={32}
                      fill={(hovered || rating) >= n ? '#F59E0B' : 'none'}
                      color={(hovered || rating) >= n ? '#F59E0B' : 'rgba(255,255,255,.2)'}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.45)', display: 'block', marginBottom: 6 }}>
                Iyong Pangalan
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="hal. Juan Dela Cruz"
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
                  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.45)', display: 'block', marginBottom: 6 }}>
                Ano ang masasabi mo?
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="hal. Maganda ang app, madaling gamitin..."
                required
                rows={3}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
                  color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.12)', color: '#fca5a5', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !rating || !name.trim() || !message.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 0', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: !rating || !name.trim() || !message.trim() ? 'rgba(22,163,74,.3)' : '#16A34A',
                color: '#fff', fontWeight: 700, fontSize: 15, minHeight: 48,
              }}
            >
              <Send size={15} /> {loading ? 'Sinisend...' : 'Isend ang Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

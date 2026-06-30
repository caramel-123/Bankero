import { useState } from 'react'
import { Star, X, Send, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  walletAddress: string | null
  isGuest: boolean
  onClose: () => void
}

export default function FeedbackModal({ walletAddress, isGuest, onClose }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating || !message.trim()) return
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.from('feedback').insert({
        display_name: walletAddress && !isGuest ? walletAddress : 'Guest',
        wallet_address: isGuest ? null : walletAddress,
        rating,
        message: message.trim(),
        is_guest: isGuest,
      })
      if (err) throw new Error(err.message)
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
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
          background: 'var(--surface)', borderRadius: 20,
          padding: '28px 24px', maxWidth: 400, width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,.25)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Leave Feedback</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={48} color="#16A34A" strokeWidth={1.5} />
            </div>
            <p style={{ color: '#16A34A', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Thank you for your feedback!</p>
            <p style={{ color: 'var(--ink-4)', fontSize: 14, marginBottom: 20 }}>Your review will appear on our landing page.</p>
            <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 10, background: '#16A34A', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Star rating */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 10 }}>
                Your rating (1–5 stars)
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
                      color={(hovered || rating) >= n ? '#F59E0B' : 'var(--border)'}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>
                Your comment
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Great app, easy to use..."
                required
                rows={4}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10,
                  background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                  color: 'var(--ink)', fontSize: 14, outline: 'none', resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#DC2626', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !rating || !message.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 0', borderRadius: 12, border: 'none',
                cursor: loading || !rating || !message.trim() ? 'not-allowed' : 'pointer',
                background: !rating || !message.trim() ? '#D1FAE5' : '#16A34A',
                color: !rating || !message.trim() ? '#6EE7B7' : '#fff',
                fontWeight: 700, fontSize: 15, minHeight: 48, transition: 'background 150ms',
              }}
            >
              <Send size={15} /> {loading ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

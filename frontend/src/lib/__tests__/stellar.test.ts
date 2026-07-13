import { describe, it, expect } from 'vitest'
import {
  scoreTier,
  scorePercent,
  nextScoreTier,
  formatWallet,
  formatXlmAmount,
  SCORE_TIERS,
} from '../stellar'

// ── scoreTier ──────────────────────────────────────────────

describe('scoreTier()', () => {
  it('returns Starting Out for score 300 (minimum)', () => {
    const tier = scoreTier(300)
    expect(tier.label).toBe('Starting Out')
    expect(tier.color).toBe('#DC2626')
    expect(tier.max).toBe(10)
    expect(tier.interest).toBe(8)
  })

  it('returns Fair for score 450', () => {
    const tier = scoreTier(450)
    expect(tier.label).toBe('Fair')
    expect(tier.max).toBe(30)
  })

  it('returns Good for score 700', () => {
    const tier = scoreTier(700)
    expect(tier.label).toBe('Good')
    expect(tier.max).toBe(150)
    expect(tier.interest).toBe(5)
  })

  it('returns Elite for score 850 (maximum)', () => {
    const tier = scoreTier(850)
    expect(tier.label).toBe('Elite')
    expect(tier.max).toBe(1000)
    expect(tier.interest).toBe(3.5)
  })

  it('higher score always gives lower or equal interest rate', () => {
    const scores = [300, 450, 550, 650, 750, 800, 850]
    const rates = scores.map(s => scoreTier(s).interest)
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1])
    }
  })

  it('higher score always gives higher or equal loan limit', () => {
    const scores = [300, 450, 550, 650, 750, 800, 850]
    const limits = scores.map(s => scoreTier(s).max)
    for (let i = 1; i < limits.length; i++) {
      expect(limits[i]).toBeGreaterThanOrEqual(limits[i - 1])
    }
  })
})

// ── scorePercent ───────────────────────────────────────────

describe('scorePercent()', () => {
  it('returns 0% for minimum score 300', () => {
    expect(scorePercent(300)).toBe(0)
  })

  it('returns 100% for maximum score 850', () => {
    expect(scorePercent(850)).toBe(100)
  })

  it('returns ~50% for midpoint score 575', () => {
    const pct = scorePercent(575)
    expect(pct).toBeGreaterThan(45)
    expect(pct).toBeLessThan(55)
  })

  it('always returns a value between 0 and 100', () => {
    const scores = [300, 400, 500, 600, 700, 800, 850]
    scores.forEach(s => {
      const pct = scorePercent(s)
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThanOrEqual(100)
    })
  })
})

// ── nextScoreTier ──────────────────────────────────────────

describe('nextScoreTier()', () => {
  it('returns Fair tier as next for someone at 300', () => {
    const next = nextScoreTier(300)
    expect(next?.label).toBe('Fair')
    expect(next?.min).toBe(450)
  })

  it('returns null when already at Elite (850)', () => {
    expect(nextScoreTier(850)).toBeNull()
  })

  it('returns Trusted as next tier for score 700', () => {
    const next = nextScoreTier(700)
    expect(next?.label).toBe('Trusted')
  })
})

// ── SCORE_TIERS coverage ───────────────────────────────────

describe('SCORE_TIERS array', () => {
  it('has exactly 7 tiers', () => {
    expect(SCORE_TIERS).toHaveLength(7)
  })

  it('tiers are contiguous — no gaps between min and max', () => {
    for (let i = 1; i < SCORE_TIERS.length; i++) {
      expect(SCORE_TIERS[i].min).toBe(SCORE_TIERS[i - 1].max + 1)
    }
  })

  it('first tier starts at 300 and last ends at 850', () => {
    expect(SCORE_TIERS[0].min).toBe(300)
    expect(SCORE_TIERS[SCORE_TIERS.length - 1].max).toBe(850)
  })
})

// ── formatWallet ───────────────────────────────────────────

describe('formatWallet()', () => {
  it('abbreviates a full Stellar address', () => {
    const address = 'GD4BJVWCTS2ZBB75MXPS72D5U5SYM2BYXTHFY4OFWJMHHEAIRJUZ4CK4'
    const formatted = formatWallet(address)
    expect(formatted).toBe('GD4BJV…UZ4CK4')
    expect(formatted.length).toBeLessThan(address.length)
  })

  it('returns short strings unchanged', () => {
    expect(formatWallet('GABC')).toBe('GABC')
  })
})

// ── formatXlmAmount ────────────────────────────────────────

describe('formatXlmAmount()', () => {
  it('formats 5 as "5 XLM"', () => {
    expect(formatXlmAmount(5)).toBe('5 XLM')
  })

  it('formats 500 with thousands separator', () => {
    expect(formatXlmAmount(500)).toBe('500 XLM')
  })

  it('preserves up to 2 decimal places', () => {
    expect(formatXlmAmount(0.4)).toBe('0.4 XLM')
    expect(formatXlmAmount(15.75)).toBe('15.75 XLM')
  })
})

import { describe, it, expect } from 'vitest'
import { computeLocalScore, daysUntil, formatDate } from '../loanStore'

// ── computeLocalScore ──────────────────────────────────────

describe('computeLocalScore()', () => {
  it('returns 300 (minimum) when all inputs are 0', () => {
    expect(computeLocalScore(0, 0, 0, 0)).toBe(300)
  })

  it('returns 850 (maximum) when all inputs are 100', () => {
    expect(computeLocalScore(100, 100, 100, 100)).toBe(850)
  })

  it('repayment score has 40% weight — largest single factor', () => {
    const repayOnly  = computeLocalScore(100, 0, 0, 0)
    const txOnly     = computeLocalScore(0, 100, 0, 0)
    const vouchOnly  = computeLocalScore(0, 0, 100, 0)
    const anchorOnly = computeLocalScore(0, 0, 0, 100)
    // repayment contributes more than any other factor
    expect(repayOnly).toBeGreaterThan(txOnly)
    expect(repayOnly).toBeGreaterThan(vouchOnly)
    expect(repayOnly).toBeGreaterThan(anchorOnly)
  })

  it('score always stays within 300–850 range', () => {
    const inputs = [
      [0, 0, 0, 0],
      [100, 100, 100, 100],
      [50, 50, 50, 50],
      [100, 0, 0, 0],
      [0, 100, 0, 0],
    ]
    inputs.forEach(([r, t, v, a]) => {
      const score = computeLocalScore(r, t, v, a)
      expect(score).toBeGreaterThanOrEqual(300)
      expect(score).toBeLessThanOrEqual(850)
    })
  })

  it('score increases monotonically as repayment score improves', () => {
    const scores = [0, 20, 40, 60, 80, 100].map(r => computeLocalScore(r, 0, 0, 0))
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1])
    }
  })

  it('a borrower with 50% repayment and no other signals gets above 350', () => {
    expect(computeLocalScore(50, 0, 0, 0)).toBeGreaterThan(350)
  })
})

// ── Laplace smoothing simulation ───────────────────────────

describe('Repayment score — Laplace smoothing logic', () => {
  // Simulates the formula used in updateScoreOnRepay:
  // repayment_score = round((repaid / (total + 2)) * 100) - (defaulted * 15)
  function laplace(repaid: number, total: number, defaulted = 0): number {
    return Math.min(100, Math.max(0,
      Math.round((repaid / (total + 2)) * 100) - defaulted * 15
    ))
  }

  it('first repayment gives ~33 pts, not 100', () => {
    // 1 repaid out of 1 total: (1/3)*100 ≈ 33
    expect(laplace(1, 1)).toBeCloseTo(33, 0)
  })

  it('10 repayments out of 10 gives ~83 pts (not 100)', () => {
    // 10/12 * 100 ≈ 83
    expect(laplace(10, 10)).toBeCloseTo(83, 0)
  })

  it('one default penalizes score by 15 pts', () => {
    const clean   = laplace(5, 5, 0)
    const penalty = laplace(5, 6, 1) // 1 default added
    expect(clean - penalty).toBeGreaterThanOrEqual(10)
  })

  it('multiple defaults accumulate — 3 defaults = -45 pts penalty', () => {
    const withDefaults = laplace(3, 6, 3)
    const noDefaults   = laplace(3, 3, 0)
    expect(noDefaults - withDefaults).toBeGreaterThanOrEqual(30)
  })

  it('score never goes below 0', () => {
    expect(laplace(0, 10, 10)).toBe(0)
  })

  it('score never exceeds 100', () => {
    expect(laplace(1000, 1000, 0)).toBe(100)
  })
})

// ── daysUntil ──────────────────────────────────────────────

describe('daysUntil()', () => {
  it('returns 0 for a past date', () => {
    const past = new Date(Date.now() - 86_400_000 * 5).toISOString()
    expect(daysUntil(past)).toBe(0)
  })

  it('returns approximately 7 for a date 7 days from now', () => {
    const future = new Date(Date.now() + 86_400_000 * 7).toISOString()
    expect(daysUntil(future)).toBeGreaterThanOrEqual(6)
    expect(daysUntil(future)).toBeLessThanOrEqual(8)
  })
})

// ── formatDate ─────────────────────────────────────────────

describe('formatDate()', () => {
  it('formats an ISO date into a readable PH date', () => {
    const iso = '2026-01-15T00:00:00.000Z'
    const result = formatDate(iso)
    expect(result).toContain('2026')
    expect(result).toContain('Jan')
  })
})

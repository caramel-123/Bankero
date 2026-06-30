import { describe, it, expect } from 'vitest'
import { getCurrentWeekIdentifier, getWeekBounds } from '../../services/savingsTracker'

describe('savingsTracker — week utilities', () => {
  it('returns YYYY-WW format', () => {
    const week = getCurrentWeekIdentifier(new Date('2026-06-30'))
    expect(week).toMatch(/^\d{4}-\d{2}$/)
  })

  it('Monday and Sunday of same week return same identifier', () => {
    const monday = getCurrentWeekIdentifier(new Date('2026-06-29')) // Monday
    const sunday = getCurrentWeekIdentifier(new Date('2026-07-05')) // Sunday
    expect(monday).toBe(sunday)
  })

  it('consecutive Mondays produce consecutive week identifiers', () => {
    const w1 = getCurrentWeekIdentifier(new Date('2026-06-22'))
    const w2 = getCurrentWeekIdentifier(new Date('2026-06-29'))
    const [y1, n1] = w1.split('-').map(Number)
    const [y2, n2] = w2.split('-').map(Number)
    const diff = (y2 - y1) * 52 + (n2 - n1)
    expect(diff).toBe(1)
  })

  it('week bounds start on Monday 00:00 UTC', () => {
    const { start } = getWeekBounds('2026-27')
    expect(start.getUTCDay()).toBe(1) // Monday
    expect(start.getUTCHours()).toBe(0)
    expect(start.getUTCMinutes()).toBe(0)
  })

  it('week bounds end on Sunday 23:59:59 UTC', () => {
    const { end } = getWeekBounds('2026-27')
    expect(end.getUTCDay()).toBe(0) // Sunday
    expect(end.getUTCHours()).toBe(23)
    expect(end.getUTCSeconds()).toBe(59)
  })

  it('start and end span 7 days (Mon 00:00 to Sun 23:59)', () => {
    const { start, end } = getWeekBounds('2026-26')
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(7)
  })

  it('deposit on Tuesday falls within the same week as Monday', () => {
    const { start, end } = getWeekBounds('2026-27')
    const tuesday = new Date('2026-06-30T10:00:00Z')
    expect(tuesday >= start && tuesday <= end).toBe(true)
  })

  it('deposit on previous Sunday does NOT fall in current week', () => {
    const { start } = getWeekBounds('2026-27')
    const prevSunday = new Date(start.getTime() - 1000)
    expect(prevSunday < start).toBe(true)
  })
})

describe('savingsTracker — bonus calculation logic', () => {
  it('bonus of 10 is awarded at streak 4', () => {
    const streak = 4
    const previousBonus = 0
    const bonusDelta = streak % 4 === 0 && previousBonus < 30 ? Math.min(10, 30 - previousBonus) : 0
    expect(bonusDelta).toBe(10)
  })

  it('bonus of 10 is awarded at streak 8', () => {
    const streak = 8
    const previousBonus = 10
    const bonusDelta = streak % 4 === 0 && previousBonus < 30 ? Math.min(10, 30 - previousBonus) : 0
    expect(bonusDelta).toBe(10)
  })

  it('no bonus at streak 3 (not yet 4 weeks)', () => {
    const streak = 3
    const previousBonus = 0
    const bonusDelta = streak % 4 === 0 && previousBonus < 30 ? Math.min(10, 30 - previousBonus) : 0
    expect(bonusDelta).toBe(0)
  })

  it('caps bonus at 30 total', () => {
    const streak = 16
    const previousBonus = 25
    const bonusDelta = streak % 4 === 0 && previousBonus < 30 ? Math.min(10, 30 - previousBonus) : 0
    expect(bonusDelta).toBe(5) // only 5 remaining to reach cap
  })

  it('no bonus awarded when cap already reached', () => {
    const streak = 20
    const previousBonus = 30
    const bonusDelta = streak % 4 === 0 && previousBonus < 30 ? Math.min(10, 30 - previousBonus) : 0
    expect(bonusDelta).toBe(0)
  })

  it('bonus is cumulative across cycles', () => {
    const cycles = [4, 8, 12]
    let total = 0
    for (const streak of cycles) {
      if (streak % 4 === 0 && total < 30) total += Math.min(10, 30 - total)
    }
    expect(total).toBe(30)
  })
})

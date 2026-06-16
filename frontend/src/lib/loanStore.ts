// Simple localStorage-backed loan store shared between Apply and Tracking pages

export type LoanStatus = 'Pending' | 'Approved' | 'Disbursed' | 'Repaid' | 'Defaulted' | 'Rejected'

export interface LocalLoan {
  id: string
  amount: number
  interest: number
  total: number
  purpose: string
  term: number
  notes: string
  status: LoanStatus
  appliedAt: string        // ISO date string
  dueAt: string | null     // set when Disbursed
  wallet: string
}

const KEY = 'bankero_loans'

export function getLoans(): LocalLoan[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveLoan(loan: LocalLoan): void {
  const loans = getLoans()
  const idx = loans.findIndex(l => l.id === loan.id)
  if (idx >= 0) loans[idx] = loan
  else loans.unshift(loan)
  localStorage.setItem(KEY, JSON.stringify(loans))
}

export function updateLoanStatus(id: string, status: LoanStatus): void {
  const loans = getLoans()
  const loan = loans.find(l => l.id === id)
  if (!loan) return
  loan.status = status
  if (status === 'Disbursed') {
    const due = new Date()
    // term is in days
    due.setDate(due.getDate() + loan.term)
    loan.dueAt = due.toISOString()
  }
  localStorage.setItem(KEY, JSON.stringify(loans))
}

export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' })
}

// ── Local score cache (updated on repayment) ─────────────
const SCORE_KEY = 'bankero_score_cache'

export interface ScoreCache {
  wallet: string
  repayment_score: number
  total_loans: number
  loans_repaid: number
  loans_defaulted: number
  last_updated: string
}

export function getScoreCache(wallet: string): ScoreCache {
  try {
    const all = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{}')
    return all[wallet] ?? { wallet, repayment_score: 0, total_loans: 0, loans_repaid: 0, loans_defaulted: 0, last_updated: '' }
  } catch {
    return { wallet, repayment_score: 0, total_loans: 0, loans_repaid: 0, loans_defaulted: 0, last_updated: '' }
  }
}

export function updateScoreOnRepay(wallet: string): ScoreCache {
  const all = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{}')
  const prev = all[wallet] ?? { wallet, repayment_score: 0, total_loans: 0, loans_repaid: 0, loans_defaulted: 0 }
  const total = (prev.total_loans ?? 0) + 1
  const repaid = (prev.loans_repaid ?? 0) + 1
  // Laplace smoothing: (repaid / (total + 2)) * 100 so 1 repay ≈ 33, 10/10 ≈ 83
  // Subtracts 15 pts per default. Clamped 0–100.
  const repayment_score = Math.min(100, Math.max(0, Math.round((repaid / (total + 2)) * 100) - (prev.loans_defaulted ?? 0) * 15))
  const updated = { wallet, repayment_score, total_loans: total, loans_repaid: repaid, loans_defaulted: prev.loans_defaulted ?? 0, last_updated: new Date().toISOString() }
  all[wallet] = updated
  localStorage.setItem(SCORE_KEY, JSON.stringify(all))
  return updated
}

export function updateScoreOnDefault(wallet: string): ScoreCache {
  const all = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{}')
  const prev = all[wallet] ?? { wallet, repayment_score: 0, total_loans: 0, loans_repaid: 0, loans_defaulted: 0 }
  const total     = (prev.total_loans ?? 0) + 1
  const defaulted = (prev.loans_defaulted ?? 0) + 1
  // -15 penalty per default, clamped 0–100
  const repayment_score = Math.min(100, Math.max(0,
    Math.round(((prev.loans_repaid ?? 0) / total) * 100) - (defaulted * 15)
  ))
  const updated = { wallet, repayment_score, total_loans: total, loans_repaid: prev.loans_repaid ?? 0, loans_defaulted: defaulted, last_updated: new Date().toISOString() }
  all[wallet] = updated
  localStorage.setItem(SCORE_KEY, JSON.stringify(all))
  return updated
}

// Compute final 300-850 score from all factors
export function computeLocalScore(repayment: number, tx: number, vouch: number, anchor: number): number {
  const raw = repayment * 40 + tx * 25 + vouch * 20 + anchor * 15
  return Math.round(300 + (raw * 550 / 10000))
}

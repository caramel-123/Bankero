// Loan store — Supabase primary, localStorage fallback/cache
import {
  saveLoanToSupabase,
  updateLoanStatusInSupabase,
  getLoansFromSupabase,
  getAllLoansFromSupabase,
  upsertScoreCache,
  getScoreCacheFromSupabase,
  type SupabaseLoan,
} from './supabase'

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
  appliedAt: string
  dueAt: string | null
  wallet: string
  lenderWallet?: string
}

const KEY = 'bankero_loans'

// ── LocalStorage helpers (cache layer) ────────────────────

function cacheGet(): LocalLoan[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function cacheSet(loans: LocalLoan[]): void {
  localStorage.setItem(KEY, JSON.stringify(loans))
}

function supabaseToLocal(l: SupabaseLoan): LocalLoan {
  return {
    id: l.id,
    amount: l.amount,
    interest: l.interest,
    total: l.total,
    purpose: l.purpose ?? '',
    term: l.term,
    notes: l.notes ?? '',
    status: l.status,
    appliedAt: l.applied_at,
    dueAt: l.due_at ?? null,
    wallet: l.borrower_wallet,
    lenderWallet: l.lender_wallet ?? undefined,
  }
}

// ── Public API ─────────────────────────────────────────────

/** Read-sync: fetch from Supabase, merge with cache, return list */
export async function fetchLoans(borrowerWallet: string): Promise<LocalLoan[]> {
  try {
    const remote = await getLoansFromSupabase(borrowerWallet)
    const fromDB = remote.map(supabaseToLocal)

    // Merge: keep any locally-cached loans for this wallet that haven't
    // synced to Supabase yet (e.g. save failed / offline).
    const cachedForWallet = cacheGet().filter(l => l.wallet === borrowerWallet)
    const dbIds = new Set(fromDB.map(l => l.id))
    const pendingLocal = cachedForWallet.filter(l => !dbIds.has(l.id))

    // Merge: Supabase is source of truth for known IDs; keep unsynced local entries
    const merged = [...fromDB, ...pendingLocal]

    // Only update the cache for this wallet; leave other wallets' entries intact
    const others = cacheGet().filter(l => l.wallet !== borrowerWallet)
    cacheSet([...others, ...merged])

    return merged
  } catch {
    // Network/auth failure — fall back to local cache
    return cacheGet().filter(l => l.wallet === borrowerWallet)
  }
}

/** Fetch ALL loans (for lender dashboard) */
export async function fetchAllLoans(): Promise<LocalLoan[]> {
  try {
    const remote = await getAllLoansFromSupabase()
    return remote.map(supabaseToLocal)
  } catch {
    return cacheGet()
  }
}

/** Synchronous cache read (for components that can't await on every render) */
export function getLoans(): LocalLoan[] {
  return cacheGet()
}

/** Save new loan to Supabase + cache */
export async function saveLoan(loan: LocalLoan): Promise<void> {
  // Optimistic cache update
  const loans = cacheGet()
  loans.unshift(loan)
  cacheSet(loans)

  // Push to Supabase (non-fatal — localStorage is the safety net)
  try {
    await saveLoanToSupabase({
      id: loan.id,
      borrower_wallet: loan.wallet,
      amount: loan.amount,
      interest: loan.interest,
      total: loan.total,
      purpose: loan.purpose ?? '',
      term: loan.term,
      notes: loan.notes ?? '',
      status: loan.status,
      applied_at: loan.appliedAt,
    })
  } catch (err) {
    console.error('[Bankero] Loan save to Supabase failed (stored locally):', err)
  }
}

/** Update loan status in Supabase + cache */
export async function updateLoanStatus(id: string, status: LoanStatus, extra?: { lenderWallet?: string }): Promise<void> {
  // Update cache
  const loans = cacheGet()
  const loan = loans.find(l => l.id === id)
  if (loan) {
    loan.status = status
    if (status === 'Disbursed') {
      const due = new Date()
      due.setDate(due.getDate() + loan.term)
      loan.dueAt = due.toISOString()
    }
    if (extra?.lenderWallet) loan.lenderWallet = extra.lenderWallet
    cacheSet(loans)
  }

  // Compute due_at for Disbursed
  let dueAt: string | undefined
  if (status === 'Disbursed' && loan) {
    const due = new Date()
    due.setDate(due.getDate() + loan.term)
    dueAt = due.toISOString()
  }

  try {
    await updateLoanStatusInSupabase(id, status, {
      lender_wallet: extra?.lenderWallet,
      due_at: dueAt,
    })
  } catch (err) {
    console.error('[Bankero] Loan status update to Supabase failed (cache updated):', err)
    throw err  // re-throw so callers (lender dashboard) can surface the error
  }
}

export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Score Cache ────────────────────────────────────────────
const SCORE_KEY = 'bankero_score_cache'

export interface ScoreCache {
  wallet: string
  repayment_score: number
  total_loans: number
  loans_repaid: number
  loans_defaulted: number
  last_updated: string
}

function scoreGet(wallet: string): ScoreCache {
  try {
    const all = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{}')
    return all[wallet] ?? { wallet, repayment_score: 0, total_loans: 0, loans_repaid: 0, loans_defaulted: 0, last_updated: '' }
  } catch {
    return { wallet, repayment_score: 0, total_loans: 0, loans_repaid: 0, loans_defaulted: 0, last_updated: '' }
  }
}

function scoreSet(wallet: string, cache: ScoreCache): void {
  const all = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{}')
  all[wallet] = cache
  localStorage.setItem(SCORE_KEY, JSON.stringify(all))
}

export function getScoreCache(wallet: string): ScoreCache {
  return scoreGet(wallet)
}

/** Load score from Supabase into local cache (call on app init) */
export async function hydrateScoreCache(wallet: string): Promise<void> {
  try {
    const remote = await getScoreCacheFromSupabase(wallet)
    if (remote) {
      const local = scoreGet(wallet)
      // Use whichever is more up-to-date
      if (!local.last_updated || new Date(remote.last_updated) > new Date(local.last_updated)) {
        scoreSet(wallet, {
          wallet,
          repayment_score: remote.repayment_score,
          total_loans: remote.total_loans,
          loans_repaid: remote.loans_repaid,
          loans_defaulted: remote.loans_defaulted,
          last_updated: remote.last_updated,
        })
      }
    }
  } catch { /* use local */ }
}

async function persistScore(cache: ScoreCache): Promise<void> {
  scoreSet(cache.wallet, cache)
  await upsertScoreCache({
    wallet_address: cache.wallet,
    repayment_score: cache.repayment_score,
    total_loans: cache.total_loans,
    loans_repaid: cache.loans_repaid,
    loans_defaulted: cache.loans_defaulted,
    last_updated: cache.last_updated,
  }).catch(() => {}) // non-blocking
}

export async function updateScoreOnRepay(wallet: string): Promise<ScoreCache> {
  const prev = scoreGet(wallet)
  const total = prev.total_loans + 1
  const repaid = prev.loans_repaid + 1
  // Laplace smoothing: first repay ≈ 33pts, not 100
  const repayment_score = Math.min(100, Math.max(0,
    Math.round((repaid / (total + 2)) * 100) - (prev.loans_defaulted * 15)
  ))
  const updated: ScoreCache = {
    wallet, repayment_score, total_loans: total, loans_repaid: repaid,
    loans_defaulted: prev.loans_defaulted, last_updated: new Date().toISOString(),
  }
  await persistScore(updated)
  return updated
}

export async function updateScoreOnDefault(wallet: string): Promise<ScoreCache> {
  const prev = scoreGet(wallet)
  const total = prev.total_loans + 1
  const defaulted = prev.loans_defaulted + 1
  const repayment_score = Math.min(100, Math.max(0,
    Math.round((prev.loans_repaid / (total + 2)) * 100) - (defaulted * 15)
  ))
  const updated: ScoreCache = {
    wallet, repayment_score, total_loans: total, loans_repaid: prev.loans_repaid,
    loans_defaulted: defaulted, last_updated: new Date().toISOString(),
  }
  await persistScore(updated)
  return updated
}

// Compute final 300-850 score from all factors
export function computeLocalScore(repayment: number, tx: number, vouch: number, anchor: number): number {
  const raw = repayment * 40 + tx * 25 + vouch * 20 + anchor * 15
  return Math.round(300 + (raw * 550 / 10000))
}

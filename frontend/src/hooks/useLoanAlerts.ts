import { useEffect, useState } from 'react'
import { fetchLoans, type LocalLoan, type LoanStatus } from '../lib/loanStore'

// Terminal statuses never change again, so unlike Approved/Disbursed
// they can't self-clear by flowing into a later state — they need
// explicit "seen" tracking or the nav dot would stay lit forever.
const TERMINAL_STATUSES: LoanStatus[] = ['Repaid', 'Rejected', 'Defaulted']

function seenKey(walletAddress: string): string {
  return `bankero_borrower_seen_loans_${walletAddress}`
}

function getSeenIds(walletAddress: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(walletAddress))
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

/**
 * True when the borrower has a loan that needs their attention or has
 * something new to know about:
 * - 'Approved' (lender accepted, disbursement coming) / 'Disbursed'
 *   (money's in hand, repayment due) — self-clearing action-needed
 *   states, since both flow forward into a later status.
 * - 'Repaid' / 'Rejected' / 'Defaulted' — terminal "must know" states
 *   that stay flagged until the borrower opens the Transaction tab
 *   (see markLoansSeen, called from LoanTracking.tsx).
 */
export function useBorrowerLoanAlert(walletAddress: string | null | undefined): boolean {
  const [alert, setAlert] = useState(false)

  useEffect(() => {
    if (!walletAddress) { setAlert(false); return }
    let cancelled = false
    fetchLoans(walletAddress).then(loans => {
      if (cancelled) return
      const seen = getSeenIds(walletAddress)
      const needsAction = loans.some(l => l.status === 'Approved' || l.status === 'Disbursed')
      const unseenTerminal = loans.some(l => TERMINAL_STATUSES.includes(l.status) && !seen.has(l.id))
      setAlert(needsAction || unseenTerminal)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [walletAddress])

  return alert
}

/** Call when the borrower opens the Transaction tab so terminal-status loans stop flagging the nav dot. */
export function markLoansSeen(walletAddress: string, loans: LocalLoan[]): void {
  const seen = getSeenIds(walletAddress)
  let changed = false
  for (const l of loans) {
    if (TERMINAL_STATUSES.includes(l.status) && !seen.has(l.id)) {
      seen.add(l.id)
      changed = true
    }
  }
  if (changed) {
    try { localStorage.setItem(seenKey(walletAddress), JSON.stringify([...seen])) } catch { /* ignore */ }
  }
}

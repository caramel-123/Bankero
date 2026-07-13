import { useEffect, useState } from 'react'
import { fetchLoans } from '../lib/loanStore'

/**
 * True when the borrower has a loan sitting in a state that needs their
 * attention: 'Approved' (lender said yes, disbursement is coming) or
 * 'Disbursed' (money's in hand, repayment is due). Both states flow
 * forward into 'Repaid'/'Defaulted', so the flag clears itself once
 * handled — no read/unread tracking needed.
 */
export function useBorrowerLoanAlert(walletAddress: string | null | undefined): boolean {
  const [alert, setAlert] = useState(false)

  useEffect(() => {
    if (!walletAddress) { setAlert(false); return }
    let cancelled = false
    fetchLoans(walletAddress).then(loans => {
      if (cancelled) return
      setAlert(loans.some(l => l.status === 'Approved' || l.status === 'Disbursed'))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [walletAddress])

  return alert
}

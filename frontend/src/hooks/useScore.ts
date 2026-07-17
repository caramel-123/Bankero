import { useState, useEffect, useCallback } from 'react'
import { fetchOnChainScore, type BorrowerRecord } from '../lib/contracts'
import { getScoreCache, computeLocalScore, computeRepaymentScore } from '../lib/loanStore'
import { computeAnchorScore } from '../lib/anchorStore'

export type ScoreLoadState = 'idle' | 'loading' | 'loaded' | 'error'

export function useScore(publicKey: string | null) {
  const [record, setRecord] = useState<BorrowerRecord | null>(null)
  const [loadState, setLoadState] = useState<ScoreLoadState>('idle')

  const load = useCallback(async (wallet: string) => {
    setLoadState('loading')
    try {
      const onChain = await fetchOnChainScore(wallet)
      const local = getScoreCache(wallet)
      // Merge loan counters first (whichever source has seen more activity),
      // then derive repayment_score fresh from the merged counts. Taking
      // Math.max of the on-chain and local *scores* directly would get stuck
      // at whichever side hit a high number first, on-chain repayment_score
      // isn't updated by vouch/none-backed repayments (only savings-backed
      // loans call the real on-chain repay_loan), so new repayments could
      // never move the displayed score once on-chain's value was ahead.
      const total_loans     = Math.max(onChain?.total_loans ?? 0, local.total_loans)
      const loans_repaid    = Math.max(onChain?.loans_repaid ?? 0, local.loans_repaid)
      const loans_defaulted = Math.max(onChain?.loans_defaulted ?? 0, local.loans_defaulted)
      const repayment_score = computeRepaymentScore(total_loans, loans_repaid, loans_defaulted)
      const tx_score    = onChain?.tx_score    ?? 0
      const vouch_score = onChain?.vouch_score ?? 0
      // Use highest of on-chain anchor_score or locally-linked payment accounts
      const anchor_score= Math.max(onChain?.anchor_score ?? 0, computeAnchorScore(wallet))

      const merged: BorrowerRecord = {
        address:          wallet,
        score:            computeLocalScore(repayment_score, tx_score, vouch_score, anchor_score),
        tx_score,
        repayment_score,
        vouch_score,
        anchor_score,
        last_updated:     onChain?.last_updated ?? 0,
        total_loans,
        loans_repaid,
        loans_defaulted,
      }
      setRecord(merged)
      setLoadState('loaded')
    } catch {
      const local = getScoreCache(wallet)
      setRecord({
        address: wallet,
        score: computeLocalScore(local.repayment_score, 0, 0, computeAnchorScore(wallet)),
        tx_score: 0, repayment_score: local.repayment_score,
        vouch_score: 0, anchor_score: computeAnchorScore(wallet),
        last_updated: 0,
        total_loans: local.total_loans, loans_repaid: local.loans_repaid, loans_defaulted: local.loans_defaulted,
      })
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    if (!publicKey) { setRecord(null); setLoadState('idle'); return }
    load(publicKey)
  }, [publicKey, load])

  // Allow manual refresh (e.g. after repayment)
  const refresh = useCallback(() => {
    if (publicKey) load(publicKey)
  }, [publicKey, load])

  return { record, loadState, isLoading: loadState === 'loading', refresh }
}

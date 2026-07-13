import { supabase } from '../lib/supabase'
import { CONTRACT_IDS, xlmToStroops, stroopsToXlm } from '../lib/stellar'
import {
  fetchSavingsBankBalance, fetchSavingsBankTxCount, invokeContractWrite, addressAmountArgs,
} from '../lib/contracts'
import { updateSavingsStreak } from './savingsTracker'
import type { SavingsBankTransaction } from '../types/savingsBank'

/** Read the on-chain balance for a wallet, in XLM (0 if never deposited / contract unset). */
export async function getBalance(walletAddress: string): Promise<number> {
  const stroops = await fetchSavingsBankBalance(walletAddress)
  return stroopsToXlm(stroops)
}

export async function getTransactions(userId: string, limit = 20): Promise<SavingsBankTransaction[]> {
  const { data } = await supabase
    .from('savings_bank_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as SavingsBankTransaction[]
}

/**
 * Award a small, capped tx_score bonus for savings-bank activity — same
 * convention as awardSavingsBonus in services/savingsTracker.ts (+bonus,
 * capped at 100 total), but keyed by the actual wallet address rather than
 * the Supabase users.id, matching how score_cache is read elsewhere
 * (frontend/src/lib/loanStore.ts's getScoreCache/persistScore).
 */
const DEPOSIT_BONUS = 2
const MAX_SAVINGS_BANK_BONUS = 20

async function awardSavingsBankBonus(walletAddress: string, txCountAfter: number): Promise<number> {
  if (txCountAfter > 10) return 0 // bonus caps out after 10 qualifying transactions

  const { data: cache } = await supabase
    .from('score_cache')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle()

  const currentTxScore = cache?.tx_score ?? 0
  const bonus = Math.min(DEPOSIT_BONUS, MAX_SAVINGS_BANK_BONUS, 100 - currentTxScore)
  if (bonus <= 0) return 0

  await supabase.from('score_cache').upsert({
    wallet_address: walletAddress,
    tx_score: currentTxScore + bonus,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'wallet_address' })

  return bonus
}

async function recordTransaction(opts: {
  userId: string
  walletAddress: string
  type: 'deposit' | 'withdraw'
  amountXlm: number
  txHash: string
  balanceAfterXlm: number
}): Promise<void> {
  const bonus = opts.type === 'deposit'
    ? await awardSavingsBankBonus(opts.walletAddress, await fetchSavingsBankTxCount(opts.walletAddress))
    : 0

  await supabase.from('savings_bank_transactions').insert({
    user_id: opts.userId,
    stellar_address: opts.walletAddress,
    type: opts.type,
    amount_xlm: opts.amountXlm,
    tx_hash: opts.txHash,
    balance_after_xlm: opts.balanceAfterXlm,
    score_bonus_applied: bonus,
  })
}

/** Deposit XLM into the savings_bank contract. Requires Freighter signing. */
export async function deposit(userId: string, walletAddress: string, amountXlm: number): Promise<number> {
  if (!CONTRACT_IDS.savingsBank) throw new Error('Savings bank contract is not configured yet.')
  const args = addressAmountArgs(walletAddress, xlmToStroops(amountXlm))
  const { hash, returnValue } = await invokeContractWrite(CONTRACT_IDS.savingsBank, 'deposit', args, walletAddress)
  const newBalance = stroopsToXlm(Number(returnValue))

  await recordTransaction({
    userId, walletAddress, type: 'deposit', amountXlm, txHash: hash, balanceAfterXlm: newBalance,
  })

  // Keep the fire-icon streak in sync with real deposits — a deposit here
  // should count toward this week's streak immediately, not only once the
  // user separately opens the Savings Streak page and taps "Check My Deposit".
  try { await updateSavingsStreak(userId, walletAddress) } catch (err) { console.error('[Bankero] streak update after deposit failed:', err) }

  return newBalance
}

/** Withdraw XLM from the savings_bank contract. Requires Freighter signing. */
export async function withdraw(userId: string, walletAddress: string, amountXlm: number): Promise<number> {
  if (!CONTRACT_IDS.savingsBank) throw new Error('Savings bank contract is not configured yet.')
  const args = addressAmountArgs(walletAddress, xlmToStroops(amountXlm))
  const { hash, returnValue } = await invokeContractWrite(CONTRACT_IDS.savingsBank, 'withdraw', args, walletAddress)
  const newBalance = stroopsToXlm(Number(returnValue))

  await recordTransaction({
    userId, walletAddress, type: 'withdraw', amountXlm, txHash: hash, balanceAfterXlm: newBalance,
  })

  return newBalance
}

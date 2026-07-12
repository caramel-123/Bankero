export interface SavingsBankTransaction {
  id: string
  user_id: string
  stellar_address: string
  type: 'deposit' | 'withdraw'
  amount_xlm: number
  tx_hash: string
  balance_after_xlm: number
  score_bonus_applied: number
  created_at: string
}

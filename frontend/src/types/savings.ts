export interface SavingsStreak {
  id: string
  user_id: string
  stellar_address: string
  current_streak: number
  longest_streak: number
  last_deposit_week: string | null // 'YYYY-WW'
  last_deposit_amount: number | null
  last_deposit_tx_hash: string | null
  total_bonus_earned: number
  updated_at: string
}

export interface WeeklyDeposit {
  id: string
  user_id: string
  stellar_address: string
  week_identifier: string // 'YYYY-WW'
  deposit_amount: number
  tx_hash: string
  deposited_at: string
  streak_count_at_deposit: number | null
  bonus_awarded: number
  created_at: string
}

export interface HorizonPayment {
  id: string
  type: string
  from: string
  to: string
  amount: string
  asset_type: string
  transaction_hash: string
  created_at: string
}

export interface DepositCheckResult {
  found: boolean
  deposit: HorizonPayment | null
  weekIdentifier: string
}

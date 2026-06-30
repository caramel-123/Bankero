export type CycleFrequency = 'weekly' | 'monthly'
export type GroupStatus = 'active' | 'completed' | 'defaulted'

export interface PaluwagaGroup {
  id: string
  group_id_onchain: number
  organizer_id: string
  group_name: string
  contribution_amount_xlm: number
  cycle_frequency: CycleFrequency
  total_cycles: number
  current_cycle: number
  status: GroupStatus
  stellar_contract_id: string | null
  created_at: string
  next_deadline: string | null
}

export interface PaluwagaMember {
  id: string
  group_id: string
  user_id: string
  stellar_address: string
  rotation_order: number        // 1-indexed — which cycle they receive the pot
  is_active: boolean
  consecutive_misses: number
  total_contributions: number
  joined_at: string
  // Joined from users table
  display_name?: string
}

export interface PaluwagaContribution {
  id: string
  group_id: string
  user_id: string
  cycle_number: number
  amount_xlm: number
  tx_hash: string
  contributed_at: string
  was_on_time: boolean
  score_bonus_applied: number
}

export interface PaluwagaPotRelease {
  id: string
  group_id: string
  cycle_number: number
  recipient_user_id: string
  total_amount_xlm: number
  tx_hash: string
  released_at: string
}

// View model combining group + current user's membership info
export interface PaluwagaGroupView extends PaluwagaGroup {
  my_rotation_order: number
  my_total_contributions: number
  my_consecutive_misses: number
  my_is_active: boolean
  members: PaluwagaMember[]
  pot_per_cycle: number              // contribution_amount_xlm × member count
  days_until_deadline: number | null
}

export interface CreateGroupPayload {
  group_name: string
  contribution_amount_xlm: number
  cycle_frequency: CycleFrequency
  members: { stellar_address: string; display_name?: string }[]
}

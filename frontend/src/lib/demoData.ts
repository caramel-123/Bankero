// Mock data used when wallet.isGuest === true
// All pages read from these instead of Supabase/Stellar

export const DEMO_WALLET = 'GDEMO7BANKERO5UNBANKED3FILIPINO2CREDIT1SCORE8STELLAR9TESTNET'

export const DEMO_SCORE_RECORD = {
  wallet_address: DEMO_WALLET,
  score: 725,
  tx_score: 68,
  repayment_score: 85,
  vouch_score: 60,
  anchor_score: 45,
  total_loans: 3,
  loans_repaid: 2,
  loans_defaulted: 0,
  last_updated: new Date().toISOString(),
}

export const DEMO_LOANS = [
  {
    id: 'DEMO-LOAN-001',
    borrower_wallet: DEMO_WALLET,
    lender_wallet: 'GLENDER1DEMO2BANKERO3STELLAR4TESTNET5LENDER6WALLET7ADDRESS',
    amount: 150,       // XLM
    interest: 7,       // XLM
    total: 157,
    purpose: 'Pang-negosyo — pagbili ng paninda',
    term: 30,
    notes: 'Sari-sari store restock',
    status: 'Disbursed',
    applied_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    due_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    disbursed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    repaid_at: null,
    defaulted_at: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    wallet: DEMO_WALLET,
  },
  {
    id: 'DEMO-LOAN-002',
    borrower_wallet: DEMO_WALLET,
    lender_wallet: 'GLENDER1DEMO2BANKERO3STELLAR4TESTNET5LENDER6WALLET7ADDRESS',
    amount: 50,
    interest: 4,
    total: 54,
    purpose: 'Gamot at ospital',
    term: 14,
    notes: '',
    status: 'Repaid',
    applied_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    due_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString(),
    disbursed_at: new Date(Date.now() - 43 * 24 * 60 * 60 * 1000).toISOString(),
    repaid_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    defaulted_at: null,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    wallet: DEMO_WALLET,
  },
  {
    id: 'DEMO-LOAN-003',
    borrower_wallet: DEMO_WALLET,
    lender_wallet: 'GLENDER1DEMO2BANKERO3STELLAR4TESTNET5LENDER6WALLET7ADDRESS',
    amount: 50,
    interest: 4,
    total: 54,
    purpose: 'Bayad sa ilaw',
    term: 7,
    notes: '',
    status: 'Repaid',
    applied_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    due_at: new Date(Date.now() - 82 * 24 * 60 * 60 * 1000).toISOString(),
    approved_at: new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString(),
    disbursed_at: new Date(Date.now() - 88 * 24 * 60 * 60 * 1000).toISOString(),
    repaid_at: new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString(),
    defaulted_at: null,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString(),
    wallet: DEMO_WALLET,
  },
]

export const DEMO_USER = {
  id: 'demo-user-id',
  wallet_address: DEMO_WALLET,
  display_name: 'Demo Borrower',
  kyc_verified: false,
  anchor_linked: false,
  created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
}

export const DEMO_SAVINGS_STREAK = {
  id: 'demo-streak-id',
  user_id: 'demo-user-id',
  stellar_address: DEMO_WALLET,
  current_streak: 3,
  longest_streak: 5,
  last_deposit_week: '2026-26',
  last_deposit_amount: 2.5,
  last_deposit_tx_hash: 'DEMOTXHASH123456789',
  total_bonus_earned: 10,
  updated_at: new Date().toISOString(),
}

export const DEMO_WEEKLY_DEPOSITS = [
  { id: '1', user_id: 'demo', stellar_address: DEMO_WALLET, week_identifier: '2026-24', deposit_amount: 1.5, tx_hash: 'TX1', deposited_at: new Date(Date.now() - 21 * 86400000).toISOString(), streak_count_at_deposit: 1, bonus_awarded: 0, created_at: '' },
  { id: '2', user_id: 'demo', stellar_address: DEMO_WALLET, week_identifier: '2026-25', deposit_amount: 3.0, tx_hash: 'TX2', deposited_at: new Date(Date.now() - 14 * 86400000).toISOString(), streak_count_at_deposit: 2, bonus_awarded: 0, created_at: '' },
  { id: '3', user_id: 'demo', stellar_address: DEMO_WALLET, week_identifier: '2026-26', deposit_amount: 2.5, tx_hash: 'TX3', deposited_at: new Date(Date.now() - 7 * 86400000).toISOString(), streak_count_at_deposit: 3, bonus_awarded: 10, created_at: '' },
]

export const DEMO_POP_SUBMISSIONS = [
  {
    id: 'DEMO-POP-001',
    user_id: 'demo-user-id',
    utility_account_id: 'demo-util-001',
    biller_name: 'Meralco',
    bill_month: '2026-05',
    bill_amount: 1250.00,
    amount_paid: 1250.00,
    status: 'verified',
    verified_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    anchor_points_awarded: 3,
    created_at: new Date(Date.now() - 26 * 86400000).toISOString(),
  },
  {
    id: 'DEMO-POP-002',
    user_id: 'demo-user-id',
    utility_account_id: 'demo-util-001',
    biller_name: 'Meralco',
    bill_month: '2026-04',
    bill_amount: 980.00,
    amount_paid: 980.00,
    status: 'verified',
    verified_at: new Date(Date.now() - 56 * 86400000).toISOString(),
    anchor_points_awarded: 3,
    created_at: new Date(Date.now() - 57 * 86400000).toISOString(),
  },
]

export const DEMO_POP_STREAK = {
  id: 'demo-pop-streak-id',
  user_id: 'demo-user-id',
  utility_account_id: 'demo-util-001',
  consecutive_months: 2,
  last_verified_month: '2026-05',
  bonus_points_earned: 5,
  updated_at: new Date().toISOString(),
}

// ── Paluwagan demo data ────────────────────────────────────────────────────

export const DEMO_PALUWAGAN_GROUPS = [
  {
    id: 'demo-paluwagan-001',
    group_id_onchain: 42,
    organizer_id: 'demo-user-id',
    group_name: 'Paluwagan ng Magkakaibigan',
    contribution_amount_xlm: 20,
    cycle_frequency: 'monthly',
    total_cycles: 4,
    current_cycle: 2,
    status: 'active',
    stellar_contract_id: null,
    created_at: new Date(Date.now() - 35 * 86400000).toISOString(),
    next_deadline: new Date(Date.now() + 12 * 86400000).toISOString(),
    my_rotation_order: 3,
    my_total_contributions: 1,
    my_consecutive_misses: 0,
    my_is_active: true,
    pot_per_cycle: 80,
    days_until_deadline: 12,
    members: [],
  },
]

export const DEMO_PALUWAGAN_MEMBERS = [
  { id: 'dm-001', group_id: 'demo-paluwagan-001', user_id: 'demo-user-001', stellar_address: 'GMEMBER1DEMO2BANKERO3STELLAR4TESTNET5MEMBER6ONE7ADDRESS89', rotation_order: 1, is_active: true, consecutive_misses: 0, total_contributions: 2, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'Maria Santos' },
  { id: 'dm-002', group_id: 'demo-paluwagan-001', user_id: 'demo-user-002', stellar_address: 'GMEMBER2DEMO2BANKERO3STELLAR4TESTNET5MEMBER6TWO7ADDRESS89', rotation_order: 2, is_active: true, consecutive_misses: 0, total_contributions: 2, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'Juan dela Cruz' },
  { id: 'dm-003', group_id: 'demo-paluwagan-001', user_id: 'demo-user-id', stellar_address: DEMO_WALLET, rotation_order: 3, is_active: true, consecutive_misses: 0, total_contributions: 1, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'Demo Borrower (Ikaw)' },
  { id: 'dm-004', group_id: 'demo-paluwagan-001', user_id: 'demo-user-004', stellar_address: 'GMEMBER4DEMO2BANKERO3STELLAR4TESTNET5MEMBER6FOUR7ADDRESS8', rotation_order: 4, is_active: true, consecutive_misses: 0, total_contributions: 2, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'Ana Reyes' },
]

export const DEMO_PALUWAGAN_CONTRIBUTIONS = [
  { id: 'dc-001', group_id: 'demo-paluwagan-001', user_id: 'demo-user-001', cycle_number: 1, amount_xlm: 20, tx_hash: 'PALUWAGANCTX001', contributed_at: new Date(Date.now() - 33 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-002', group_id: 'demo-paluwagan-001', user_id: 'demo-user-002', cycle_number: 1, amount_xlm: 20, tx_hash: 'PALUWAGANCTX002', contributed_at: new Date(Date.now() - 33 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-003', group_id: 'demo-paluwagan-001', user_id: 'demo-user-id', cycle_number: 1, amount_xlm: 20, tx_hash: 'PALUWAGANCTX003', contributed_at: new Date(Date.now() - 32 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-004', group_id: 'demo-paluwagan-001', user_id: 'demo-user-004', cycle_number: 1, amount_xlm: 20, tx_hash: 'PALUWAGANCTX004', contributed_at: new Date(Date.now() - 31 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-005', group_id: 'demo-paluwagan-001', user_id: 'demo-user-001', cycle_number: 2, amount_xlm: 20, tx_hash: 'PALUWAGANCTX005', contributed_at: new Date(Date.now() - 2 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-006', group_id: 'demo-paluwagan-001', user_id: 'demo-user-002', cycle_number: 2, amount_xlm: 20, tx_hash: 'PALUWAGANCTX006', contributed_at: new Date(Date.now() - 1 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
]

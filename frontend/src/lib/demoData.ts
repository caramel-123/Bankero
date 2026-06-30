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

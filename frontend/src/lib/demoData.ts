// Read-only demo data for guest/demo mode.
// Guests can see all UI with realistic data but cannot perform financial actions.

export const DEMO_WALLET = 'GDEMO7BANKERO5UNBANKED3FILIPINO2CREDIT1SCORE8STELLAR9TESTNET'

export const DEMO_SCORE_RECORD = {
  wallet_address: DEMO_WALLET,
  score: 300,
  tx_score: 0,
  repayment_score: 0,
  vouch_score: 0,
  anchor_score: 0,
  total_loans: 0,
  loans_repaid: 0,
  loans_defaulted: 0,
  last_updated: new Date().toISOString(),
}

export const DEMO_LOANS = [
  {
    id: 'DEMO-LOAN-001',
    borrower_wallet: DEMO_WALLET,
    lender_wallet: 'GLENDER1BANKERO2STELLAR3TESTNET4LENDER5WALLET6ADDRESS7890',
    amount: 1500, interest: 75, total: 1575,
    purpose: 'Pang-negosyo — pagbili ng paninda',
    term: 30, notes: 'Sari-sari store restock', status: 'Disbursed',
    appliedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    dueAt: new Date(Date.now() + 20 * 86400000).toISOString(),
    wallet: DEMO_WALLET,
  },
  {
    id: 'DEMO-LOAN-002',
    borrower_wallet: DEMO_WALLET,
    lender_wallet: 'GLENDER1BANKERO2STELLAR3TESTNET4LENDER5WALLET6ADDRESS7890',
    amount: 500, interest: 25, total: 525,
    purpose: 'Gamot at ospital',
    term: 14, notes: '', status: 'Repaid',
    appliedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    dueAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    wallet: DEMO_WALLET,
  },
  {
    id: 'DEMO-LOAN-003',
    borrower_wallet: DEMO_WALLET,
    lender_wallet: 'GLENDER1BANKERO2STELLAR3TESTNET4LENDER5WALLET6ADDRESS7890',
    amount: 500, interest: 25, total: 525,
    purpose: 'Bayad sa ilaw at tubig',
    term: 7, notes: '', status: 'Repaid',
    appliedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    dueAt: new Date(Date.now() - 82 * 86400000).toISOString(),
    wallet: DEMO_WALLET,
  },
]

export const DEMO_USER = {
  id: 'demo-user-id',
  wallet_address: DEMO_WALLET,
  display_name: 'Demo Borrower',
  kyc_verified: false,
  anchor_linked: false,
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
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
    id: 'DEMO-POP-001', user_id: 'demo-user-id', utility_account_id: 'demo-util-001',
    billing_period: '05/2026', amount_due: 1250, amount_paid: 1250,
    transaction_date: new Date(Date.now() - 25 * 86400000).toISOString(),
    reference_number: 'REF-DEMO-001', biller_name: 'Meralco',
    bill_image_url: '', receipt_image_url: '',
    ocr_bill_data: null, ocr_receipt_data: null,
    validation_status: 'passed', validation_errors: null,
    score_applied: true, created_at: new Date(Date.now() - 26 * 86400000).toISOString(),
  },
  {
    id: 'DEMO-POP-002', user_id: 'demo-user-id', utility_account_id: 'demo-util-001',
    billing_period: '04/2026', amount_due: 980, amount_paid: 980,
    transaction_date: new Date(Date.now() - 56 * 86400000).toISOString(),
    reference_number: 'REF-DEMO-002', biller_name: 'Meralco',
    bill_image_url: '', receipt_image_url: '',
    ocr_bill_data: null, ocr_receipt_data: null,
    validation_status: 'passed', validation_errors: null,
    score_applied: true, created_at: new Date(Date.now() - 57 * 86400000).toISOString(),
  },
]

export const DEMO_POP_STREAK = {
  id: 'demo-pop-streak-id', user_id: 'demo-user-id', utility_account_id: 'demo-util-001',
  consecutive_months: 2, last_verified_period: '05/2026',
  total_score_bonus: 5, updated_at: new Date().toISOString(),
}

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
  { id: 'dm-001', group_id: 'demo-paluwagan-001', user_id: 'demo-user-001', stellar_address: 'GMEMBER1DEMO000000000000000000000000000000000000000000001', rotation_order: 1, is_active: true, consecutive_misses: 0, total_contributions: 2, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'Maria Santos' },
  { id: 'dm-002', group_id: 'demo-paluwagan-001', user_id: 'demo-user-002', stellar_address: 'GMEMBER2DEMO000000000000000000000000000000000000000000002', rotation_order: 2, is_active: true, consecutive_misses: 0, total_contributions: 2, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'Juan dela Cruz' },
  { id: 'dm-003', group_id: 'demo-paluwagan-001', user_id: 'demo-user-id',  stellar_address: DEMO_WALLET, rotation_order: 3, is_active: true, consecutive_misses: 0, total_contributions: 1, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'You (Demo)' },
  { id: 'dm-004', group_id: 'demo-paluwagan-001', user_id: 'demo-user-004', stellar_address: 'GMEMBER4DEMO000000000000000000000000000000000000000000004', rotation_order: 4, is_active: true, consecutive_misses: 0, total_contributions: 2, joined_at: new Date(Date.now() - 35 * 86400000).toISOString(), display_name: 'Ana Reyes' },
]

export const DEMO_PALUWAGAN_CONTRIBUTIONS = [
  { id: 'dc-001', group_id: 'demo-paluwagan-001', user_id: 'demo-user-001', cycle_number: 1, amount_xlm: 20, tx_hash: 'TX001', contributed_at: new Date(Date.now() - 33 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-002', group_id: 'demo-paluwagan-001', user_id: 'demo-user-002', cycle_number: 1, amount_xlm: 20, tx_hash: 'TX002', contributed_at: new Date(Date.now() - 33 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-003', group_id: 'demo-paluwagan-001', user_id: 'demo-user-id',  cycle_number: 1, amount_xlm: 20, tx_hash: 'TX003', contributed_at: new Date(Date.now() - 32 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-004', group_id: 'demo-paluwagan-001', user_id: 'demo-user-004', cycle_number: 1, amount_xlm: 20, tx_hash: 'TX004', contributed_at: new Date(Date.now() - 31 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-005', group_id: 'demo-paluwagan-001', user_id: 'demo-user-001', cycle_number: 2, amount_xlm: 20, tx_hash: 'TX005', contributed_at: new Date(Date.now() - 2 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
  { id: 'dc-006', group_id: 'demo-paluwagan-001', user_id: 'demo-user-002', cycle_number: 2, amount_xlm: 20, tx_hash: 'TX006', contributed_at: new Date(Date.now() - 1 * 86400000).toISOString(), was_on_time: true, score_bonus_applied: 3 },
]

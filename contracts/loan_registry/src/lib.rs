//! # loan_registry contract
//!
//! Manages the full micro-loan lifecycle on Bankero:
//!   apply → approve → disburse → repay → score update
//!   apply → approve → disburse → default → slash vouchers → score penalty
//!
//! ## Loan tiers (by credit score)
//! | Score   | Max Loan (XLM) |
//! |---------|---------------|
//! | 300–499 | 500           |
//! | 500–649 | 2,000         |
//! | 650–799 | 5,000         |
//! | 800–850 | 10,000        |
//!
//! ## Interest
//! Flat 5% of principal. No compound interest. Set at initialization.
//!
//! ## Rules
//! - Only one active loan per borrower at a time
//! - State transitions are strictly enforced (no backward moves)
//! - All XLM amounts are in stroops (1 XLM = 10_000_000 stroops)

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    ScoreContract,
    VouchContract,
    XlmToken,
    /// Flat interest rate in basis points (e.g. 500 = 5%)
    InterestBps,
    /// Minimum credit score to apply for any loan
    MinScore,
    /// Auto-incrementing loan ID counter
    LoanCounter,
    /// loan_id → Loan struct
    Loan(u64),
    /// borrower address → Vec<u64> of loan IDs (all time)
    BorrowerLoans(Address),
    /// borrower address → current active loan_id (0 = none)
    ActiveLoan(Address),
}

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum LoanStatus {
    Pending,
    Approved,
    Disbursed,
    Repaid,
    Defaulted,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Loan {
    pub loan_id: u64,
    pub borrower: Address,
    pub lender: Address,
    /// Principal in stroops
    pub amount_stroops: i128,
    /// Principal + flat interest in stroops
    pub repayment_amount: i128,
    /// Ledger timestamp when loan was disbursed (0 if not yet disbursed)
    pub disbursed_at: u64,
    /// Ledger timestamp of repayment deadline (disbursed_at + term_secs)
    pub due_at: u64,
    /// Ledger timestamp when repaid (0 if not repaid)
    pub repaid_at: u64,
    /// Term in days
    pub term_days: u32,
    pub status: LoanStatus,
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

pub mod errors {
    pub const ALREADY_INITIALIZED: u32 = 1;
    pub const NOT_INITIALIZED: u32 = 2;
    pub const UNAUTHORIZED: u32 = 3;
    pub const SCORE_TOO_LOW: u32 = 4;
    pub const AMOUNT_EXCEEDS_TIER: u32 = 5;
    pub const ACTIVE_LOAN_EXISTS: u32 = 6;
    pub const LOAN_NOT_FOUND: u32 = 7;
    pub const INVALID_STATUS_TRANSITION: u32 = 8;
    pub const NOT_YET_DUE: u32 = 9;
    pub const INSUFFICIENT_BALANCE: u32 = 10;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECS_PER_DAY: u64 = 86_400;
const XLM_PER_STROOP: i128 = 10_000_000;

/// Max loan in XLM by credit score tier
fn tier_limit_xlm(score: u32) -> i128 {
    if score >= 800 {
        10_000
    } else if score >= 650 {
        5_000
    } else if score >= 500 {
        2_000
    } else {
        500
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn require_initialized(env: &Env) {
    if !env.storage().instance().has(&DataKey::Admin) {
        panic_with_error(env, errors::NOT_INITIALIZED);
    }
}

#[inline]
fn panic_with_error(env: &Env, code: u32) -> ! {
    env.panic_with_error(soroban_sdk::Error::from_contract_error(code))
}

fn require_admin_or_lender(env: &Env, caller: &Address, loan: &Loan) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    if caller != &admin && caller != &loan.lender {
        panic_with_error(env, errors::UNAUTHORIZED);
    }
}

fn next_loan_id(env: &Env) -> u64 {
    let id: u64 = env
        .storage()
        .instance()
        .get(&DataKey::LoanCounter)
        .unwrap_or(0u64);
    let next = id + 1;
    env.storage().instance().set(&DataKey::LoanCounter, &next);
    next
}

fn load_loan(env: &Env, loan_id: u64) -> Loan {
    env.storage()
        .persistent()
        .get(&DataKey::Loan(loan_id))
        .unwrap_or_else(|| panic_with_error(env, errors::LOAN_NOT_FOUND))
}

/// Query the credit_score contract for a borrower's current score.
/// Uses cross-contract invocation with the full exported function name.
fn get_borrower_score(env: &Env, borrower: &Address) -> u32 {
    let score_contract: Address = env
        .storage()
        .instance()
        .get(&DataKey::ScoreContract)
        .unwrap();
    env.invoke_contract(
        &score_contract,
        &soroban_sdk::Symbol::new(env, "compute_score"),
        soroban_sdk::vec![env, soroban_sdk::IntoVal::into_val(borrower, env)],
    )
}

/// Notify credit_score contract of a loan event (repaid or defaulted).
fn notify_score_loan_event(env: &Env, borrower: &Address, repaid: bool) {
    let score_contract: Address = env
        .storage()
        .instance()
        .get(&DataKey::ScoreContract)
        .unwrap();
    let this = env.current_contract_address();
    let _: () = env.invoke_contract(
        &score_contract,
        &soroban_sdk::Symbol::new(env, "record_loan_event"),
        soroban_sdk::vec![
            env,
            soroban_sdk::IntoVal::into_val(&this, env),
            soroban_sdk::IntoVal::into_val(borrower, env),
            soroban_sdk::IntoVal::into_val(&repaid, env),
        ],
    );
}

/// Notify vouching contract to slash stakes on default.
fn notify_slash(env: &Env, borrower: &Address, lender: &Address) {
    let vouch_contract: Address = env
        .storage()
        .instance()
        .get(&DataKey::VouchContract)
        .unwrap();
    let this = env.current_contract_address();
    let _: () = env.invoke_contract(
        &vouch_contract,
        &soroban_sdk::Symbol::new(env, "slash_vouchers"),
        soroban_sdk::vec![
            env,
            soroban_sdk::IntoVal::into_val(&this, env),
            soroban_sdk::IntoVal::into_val(borrower, env),
            soroban_sdk::IntoVal::into_val(lender, env),
        ],
    );
}

/// Notify vouching contract to release stakes on repayment.
fn notify_release(env: &Env, borrower: &Address, reward: i128) {
    let vouch_contract: Address = env
        .storage()
        .instance()
        .get(&DataKey::VouchContract)
        .unwrap();
    let this = env.current_contract_address();
    let _: () = env.invoke_contract(
        &vouch_contract,
        &soroban_sdk::Symbol::new(env, "release_vouches"),
        soroban_sdk::vec![
            env,
            soroban_sdk::IntoVal::into_val(&this, env),
            soroban_sdk::IntoVal::into_val(borrower, env),
            soroban_sdk::IntoVal::into_val(&reward, env),
        ],
    );
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct LoanRegistryContract;

#[contractimpl]
impl LoanRegistryContract {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// One-time setup. Must be called after credit_score and vouching are deployed.
    ///
    /// # Arguments
    /// * `admin`          – wallet with admin privileges
    /// * `score_contract` – deployed credit_score contract address
    /// * `vouch_contract` – deployed vouching contract address
    /// * `xlm_token`      – native XLM token contract address
    /// * `interest_bps`   – flat interest in basis points (500 = 5%)
    /// * `min_score`      – minimum credit score to apply for a loan (e.g. 300)
    ///
    /// # Panics
    /// * `ALREADY_INITIALIZED`
    pub fn initialize(
        env: Env,
        admin: Address,
        score_contract: Address,
        vouch_contract: Address,
        xlm_token: Address,
        interest_bps: u32,
        min_score: u32,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error(&env, errors::ALREADY_INITIALIZED);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ScoreContract, &score_contract);
        env.storage().instance().set(&DataKey::VouchContract, &vouch_contract);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::InterestBps, &interest_bps);
        env.storage().instance().set(&DataKey::MinScore, &min_score);
        env.storage().instance().set(&DataKey::LoanCounter, &0u64);

        env.events().publish((symbol_short!("init"),), (admin,));
    }

    // -----------------------------------------------------------------------
    // Loan lifecycle
    // -----------------------------------------------------------------------

    /// Submit a loan application. Checks credit score and tier limits.
    ///
    /// # Arguments
    /// * `borrower`   – the applicant (must authorize)
    /// * `lender`     – the wallet that will fund the loan
    /// * `amount`     – loan principal in stroops
    /// * `term_days`  – repayment term (7, 14, or 30 days)
    ///
    /// Returns the new `loan_id`.
    ///
    /// # Panics
    /// * `SCORE_TOO_LOW`       – borrower score below min_score
    /// * `AMOUNT_EXCEEDS_TIER` – amount > tier limit for borrower's score
    /// * `ACTIVE_LOAN_EXISTS`  – borrower already has an active loan
    pub fn apply_loan(
        env: Env,
        borrower: Address,
        lender: Address,
        amount: i128,
        term_days: u32,
    ) -> u64 {
        require_initialized(&env);
        borrower.require_auth();

        // Check for existing active loan
        let active: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ActiveLoan(borrower.clone()))
            .unwrap_or(0);
        if active != 0 {
            panic_with_error(&env, errors::ACTIVE_LOAN_EXISTS);
        }

        // Check credit score
        let min_score: u32 = env.storage().instance().get(&DataKey::MinScore).unwrap();
        let score = get_borrower_score(&env, &borrower);
        if score < min_score {
            panic_with_error(&env, errors::SCORE_TOO_LOW);
        }

        // Check tier limit
        let max_xlm = tier_limit_xlm(score);
        let max_stroops = max_xlm * XLM_PER_STROOP;
        if amount > max_stroops {
            panic_with_error(&env, errors::AMOUNT_EXCEEDS_TIER);
        }

        // Compute repayment amount: principal * (1 + interest_bps / 10000)
        let interest_bps: u32 = env.storage().instance().get(&DataKey::InterestBps).unwrap();
        let repayment_amount = amount + (amount * interest_bps as i128 / 10_000);

        let loan_id = next_loan_id(&env);

        let loan = Loan {
            loan_id,
            borrower: borrower.clone(),
            lender: lender.clone(),
            amount_stroops: amount,
            repayment_amount,
            disbursed_at: 0,
            due_at: 0,
            repaid_at: 0,
            term_days,
            status: LoanStatus::Pending,
        };

        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        // Track borrower's loan history
        let mut history: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::BorrowerLoans(borrower.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        history.push_back(loan_id);
        env.storage()
            .persistent()
            .set(&DataKey::BorrowerLoans(borrower.clone()), &history);

        // Mark as active loan for borrower
        env.storage()
            .persistent()
            .set(&DataKey::ActiveLoan(borrower.clone()), &loan_id);

        env.events().publish(
            (symbol_short!("applied"),),
            (loan_id, borrower, lender, amount),
        );

        loan_id
    }

    /// Lender approves a pending loan application.
    ///
    /// # Arguments
    /// * `lender`  – must be the loan's designated lender (must authorize)
    /// * `loan_id` – the loan to approve
    ///
    /// # Panics
    /// * `LOAN_NOT_FOUND`             – invalid loan_id
    /// * `UNAUTHORIZED`               – caller not the loan's lender
    /// * `INVALID_STATUS_TRANSITION`  – loan is not in Pending status
    pub fn approve_loan(env: Env, lender: Address, loan_id: u64) {
        require_initialized(&env);
        lender.require_auth();

        let mut loan = load_loan(&env, loan_id);

        if lender != loan.lender {
            panic_with_error(&env, errors::UNAUTHORIZED);
        }
        if loan.status != LoanStatus::Pending {
            panic_with_error(&env, errors::INVALID_STATUS_TRANSITION);
        }

        loan.status = LoanStatus::Approved;
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        env.events().publish((symbol_short!("apprvd"),), (loan_id,));
    }

    /// Lender disburses XLM to the borrower, activating the loan.
    ///
    /// XLM is transferred from the lender's wallet to the borrower.
    /// The repayment clock starts at this moment.
    ///
    /// # Arguments
    /// * `lender`  – must be the loan's lender (must authorize)
    /// * `loan_id` – the loan to disburse
    ///
    /// # Panics
    /// * `UNAUTHORIZED`              – caller not the loan's lender
    /// * `INVALID_STATUS_TRANSITION` – loan is not in Approved status
    pub fn disburse_loan(env: Env, lender: Address, loan_id: u64) {
        require_initialized(&env);
        lender.require_auth();

        let mut loan = load_loan(&env, loan_id);

        if lender != loan.lender {
            panic_with_error(&env, errors::UNAUTHORIZED);
        }
        if loan.status != LoanStatus::Approved {
            panic_with_error(&env, errors::INVALID_STATUS_TRANSITION);
        }

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);

        // Transfer principal from lender to borrower
        token_client.transfer(&lender, &loan.borrower, &loan.amount_stroops);

        let now = env.ledger().timestamp();
        loan.disbursed_at = now;
        loan.due_at = now + loan.term_days as u64 * SECS_PER_DAY;
        loan.status = LoanStatus::Disbursed;

        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        env.events().publish(
            (symbol_short!("disbsd"),),
            (loan_id, loan.borrower, loan.amount_stroops),
        );
    }

    /// Borrower repays the loan in full (principal + interest).
    ///
    /// On success:
    /// 1. XLM transferred from borrower to lender
    /// 2. Vouching contract releases stakes + 1% reward to vouchers
    /// 3. credit_score contract records the repayment
    ///
    /// # Arguments
    /// * `borrower` – the borrower (must authorize)
    /// * `loan_id`  – the loan to repay
    ///
    /// # Panics
    /// * `UNAUTHORIZED`              – caller not the borrower
    /// * `INVALID_STATUS_TRANSITION` – loan is not in Disbursed status
    pub fn repay_loan(env: Env, borrower: Address, loan_id: u64) {
        require_initialized(&env);
        borrower.require_auth();

        let mut loan = load_loan(&env, loan_id);

        if borrower != loan.borrower {
            panic_with_error(&env, errors::UNAUTHORIZED);
        }
        if loan.status != LoanStatus::Disbursed {
            panic_with_error(&env, errors::INVALID_STATUS_TRANSITION);
        }

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);

        // Transfer repayment_amount from borrower to lender
        // 1% of repayment_amount goes to vouchers; lender gets the rest
        let reward_for_vouchers = loan.repayment_amount / 100; // 1%
        let lender_receives = loan.repayment_amount - reward_for_vouchers;

        token_client.transfer(&borrower, &loan.lender, &lender_receives);

        // Transfer voucher reward pool from borrower to vouching contract
        let vouch_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::VouchContract)
            .unwrap();
        if reward_for_vouchers > 0 {
            token_client.transfer(&borrower, &vouch_contract, &reward_for_vouchers);
        }

        let now = env.ledger().timestamp();
        loan.repaid_at = now;
        loan.status = LoanStatus::Repaid;

        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        // Clear active loan
        env.storage()
            .persistent()
            .set(&DataKey::ActiveLoan(borrower.clone()), &0u64);

        // Cross-contract: notify vouching to release stakes + reward
        notify_release(&env, &borrower, reward_for_vouchers);

        // Cross-contract: notify credit_score of repayment
        notify_score_loan_event(&env, &borrower, true);

        env.events().publish(
            (symbol_short!("repaid"),),
            (loan_id, borrower, loan.repayment_amount),
        );
    }

    /// Mark a disbursed loan as defaulted after its due date has passed.
    ///
    /// On default:
    /// 1. Vouching contract is called to slash all vouch stakes → sent to lender
    /// 2. credit_score contract records the default (score penalty)
    ///
    /// # Arguments
    /// * `caller`  – must be admin or the loan's lender (must authorize)
    /// * `loan_id` – the loan to mark as defaulted
    ///
    /// # Panics
    /// * `UNAUTHORIZED`              – caller not admin or lender
    /// * `INVALID_STATUS_TRANSITION` – loan is not in Disbursed status
    /// * `NOT_YET_DUE`               – current timestamp < loan.due_at
    pub fn mark_defaulted(env: Env, caller: Address, loan_id: u64) {
        require_initialized(&env);
        caller.require_auth();

        let mut loan = load_loan(&env, loan_id);

        require_admin_or_lender(&env, &caller, &loan);

        if loan.status != LoanStatus::Disbursed {
            panic_with_error(&env, errors::INVALID_STATUS_TRANSITION);
        }

        let now = env.ledger().timestamp();
        if now < loan.due_at {
            panic_with_error(&env, errors::NOT_YET_DUE);
        }

        loan.status = LoanStatus::Defaulted;
        env.storage().persistent().set(&DataKey::Loan(loan_id), &loan);

        // Clear active loan
        env.storage()
            .persistent()
            .set(&DataKey::ActiveLoan(loan.borrower.clone()), &0u64);

        // Cross-contract: slash voucher stakes → lender
        notify_slash(&env, &loan.borrower, &loan.lender);

        // Cross-contract: notify credit_score of default
        notify_score_loan_event(&env, &loan.borrower, false);

        env.events().publish(
            (symbol_short!("defltd"),),
            (loan_id, loan.borrower),
        );
    }

    // -----------------------------------------------------------------------
    // Read functions
    // -----------------------------------------------------------------------

    /// Return the full Loan struct for a given loan_id.
    ///
    /// # Panics
    /// * `LOAN_NOT_FOUND` – invalid loan_id
    pub fn get_loan(env: Env, loan_id: u64) -> Loan {
        load_loan(&env, loan_id)
    }

    /// Return all loan IDs ever created for a borrower (all-time history).
    pub fn get_borrower_loans(env: Env, borrower: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::BorrowerLoans(borrower))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Return the active loan ID for a borrower (0 = no active loan).
    pub fn get_active_loan(env: Env, borrower: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::ActiveLoan(borrower))
            .unwrap_or(0)
    }

    /// Return the total number of loans ever issued.
    pub fn get_loan_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::LoanCounter)
            .unwrap_or(0)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup_token(env: &Env, admin: &Address) -> Address {
        let token_id = env.register_stellar_asset_contract_v2(admin.clone());
        token_id.address()
    }

    /// Full test setup: registers credit_score + loan_registry contracts so
    /// cross-contract calls to `compute_score` succeed in unit tests.
    fn setup() -> (
        Env,
        LoanRegistryContractClient<'static>,
        Address, // admin
        Address, // score_contract
        Address, // vouch_contract (mock — vouching not wired in unit tests)
        Address, // borrower
        Address, // lender
        Address, // xlm_token
    ) {
        let env = Env::default();
        env.mock_all_auths();

        // Register the credit_score contract so cross-contract calls work
        use credit_score::CreditScoreContract;
        let score_id = env.register(CreditScoreContract, ());
        let score_client = credit_score::CreditScoreContractClient::new(&env, &score_id);

        // Register loan_registry
        let loan_id = env.register(LoanRegistryContract, ());
        let client = LoanRegistryContractClient::new(&env, &loan_id);

        let admin = Address::generate(&env);
        let vouch_contract = Address::generate(&env); // mock for unit tests
        let borrower = Address::generate(&env);
        let lender = Address::generate(&env);

        let xlm_token = setup_token(&env, &admin);

        // Initialize credit_score first (required before loan_registry can query it)
        score_client.initialize(&admin, &loan_id, &vouch_contract);

        // Mint tokens
        use soroban_sdk::token::StellarAssetClient;
        StellarAssetClient::new(&env, &xlm_token).mint(&lender, &1_000_000_000_000i128);
        StellarAssetClient::new(&env, &xlm_token).mint(&borrower, &1_000_000_000_000i128);

        client.initialize(
            &admin,
            &score_id,
            &vouch_contract,
            &xlm_token,
            &500u32, // 5% interest
            &300u32, // min score 300 (matches new borrower default)
        );

        (env, client, admin, score_id, vouch_contract, borrower, lender, xlm_token)
    }

    #[test]
    fn test_apply_loan_creates_record() {
        let (_env, client, _admin, _score, _vouch, borrower, lender, _token) = setup();
        let loan_id = client.apply_loan(&borrower, &lender, &1_000_000_000i128, &7u32);
        assert_eq!(loan_id, 1);
        let loan = client.get_loan(&loan_id);
        assert_eq!(loan.status, LoanStatus::Pending);
        assert_eq!(loan.amount_stroops, 1_000_000_000i128);
    }

    #[test]
    fn test_repayment_amount_includes_interest() {
        let (_env, client, _admin, _score, _vouch, borrower, lender, _token) = setup();
        // 100 XLM principal at 5% = 105 XLM repayment
        let principal = 1_000_000_000i128; // 100 XLM
        let loan_id = client.apply_loan(&borrower, &lender, &principal, &7u32);
        let loan = client.get_loan(&loan_id);
        assert_eq!(loan.repayment_amount, 1_050_000_000i128); // 105 XLM
    }

    #[test]
    fn test_approve_changes_status() {
        let (_env, client, _admin, _score, _vouch, borrower, lender, _token) = setup();
        let loan_id = client.apply_loan(&borrower, &lender, &1_000_000_000i128, &7u32);
        client.approve_loan(&lender, &loan_id);
        let loan = client.get_loan(&loan_id);
        assert_eq!(loan.status, LoanStatus::Approved);
    }

    #[test]
    #[should_panic]
    fn test_only_lender_can_approve() {
        let (env, client, _admin, _score, _vouch, borrower, lender, _token) = setup();
        let loan_id = client.apply_loan(&borrower, &lender, &1_000_000_000i128, &7u32);
        let intruder = Address::generate(&env);
        client.approve_loan(&intruder, &loan_id);
    }

    #[test]
    #[should_panic]
    fn test_double_active_loan_blocked() {
        let (_env, client, _admin, _score, _vouch, borrower, lender, _token) = setup();
        client.apply_loan(&borrower, &lender, &1_000_000_000i128, &7u32);
        client.apply_loan(&borrower, &lender, &1_000_000_000i128, &7u32); // should panic
    }

    #[test]
    fn test_get_borrower_loans_history() {
        let (_env, client, _admin, _score, _vouch, borrower, lender, _token) = setup();
        let id1 = client.apply_loan(&borrower, &lender, &1_000_000_000i128, &7u32);
        let history = client.get_borrower_loans(&borrower);
        assert_eq!(history.len(), 1);
        assert_eq!(history.get(0).unwrap(), id1);
    }

    #[test]
    fn test_tier_limits() {
        // Score 300 → max 500 XLM = 5_000_000_000 stroops
        assert_eq!(tier_limit_xlm(300), 500);
        assert_eq!(tier_limit_xlm(499), 500);
        assert_eq!(tier_limit_xlm(500), 2_000);
        assert_eq!(tier_limit_xlm(649), 2_000);
        assert_eq!(tier_limit_xlm(650), 5_000);
        assert_eq!(tier_limit_xlm(799), 5_000);
        assert_eq!(tier_limit_xlm(800), 10_000);
        assert_eq!(tier_limit_xlm(850), 10_000);
    }
}

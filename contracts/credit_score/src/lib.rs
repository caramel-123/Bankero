//! # credit_score contract
//!
//! Aggregates multiple weighted inputs into a deterministic 300–850 credit
//! score for each Stellar wallet address. This is the single source of truth
//! for borrower reputation in the Bankero system.
//!
//! ## Score formula (integer arithmetic, no floats)
//! score_raw = (tx_score * 25) + (repayment_score * 40)
//!           + (vouch_score * 20) + (anchor_score * 15)   // 0–10000
//! final_score = 300 + (score_raw * 550 / 10000)           // 300–850
//!
//! ## Authorisation model
//! - `initialize`  : any caller, once only
//! - `update_score`: loan_registry contract, vouching contract, or admin
//! - `decay_score` : admin only, max once per 30-day window per borrower
//! - `get_score`, `compute_score`: anyone (public read)

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env,
};

// ---------------------------------------------------------------------------
// Storage key enum
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Admin address (set at initialization, immutable afterwards)
    Admin,
    /// Address of the deployed loan_registry contract
    LoanContract,
    /// Address of the deployed vouching contract
    VouchContract,
    /// Per-borrower record
    Borrower(Address),
}

// ---------------------------------------------------------------------------
// Core data structure stored on-chain per borrower
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct BorrowerRecord {
    /// The computed credit score: 300 (no history) → 850 (excellent)
    pub score: u32,
    /// Contribution from Stellar transaction activity (0–100)
    pub tx_score: u32,
    /// Contribution from loan repayment history (0–100)
    pub repayment_score: u32,
    /// Contribution from community vouching (0–100)
    pub vouch_score: u32,
    /// Contribution from anchor/remittance records (0–100)
    pub anchor_score: u32,
    /// Ledger timestamp of the last score update
    pub last_updated: u64,
    /// Total loans ever taken out
    pub total_loans: u32,
    /// Loans successfully repaid
    pub loans_repaid: u32,
    /// Loans that went to default
    pub loans_defaulted: u32,
    /// Guard: ledger time of the last decay call (0 if never)
    pub last_decay_at: u64,
}

impl BorrowerRecord {
    /// Default record for a brand-new user: score starts at 300.
    fn new_default() -> Self {
        BorrowerRecord {
            score: 300,
            tx_score: 0,
            repayment_score: 0,
            vouch_score: 0,
            anchor_score: 0,
            last_updated: 0,
            total_loans: 0,
            loans_repaid: 0,
            loans_defaulted: 0,
            last_decay_at: 0,
        }
    }
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/// Errors returned by this contract as u32 panic codes.
/// Using named constants keeps tests readable.
pub mod errors {
    pub const ALREADY_INITIALIZED: u32 = 1;
    pub const NOT_INITIALIZED: u32 = 2;
    pub const UNAUTHORIZED: u32 = 3;
    pub const SCORE_OUT_OF_RANGE: u32 = 4;
    pub const DECAY_TOO_SOON: u32 = 5;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// 30 days expressed in seconds (used for decay guard)
const THIRTY_DAYS_SECS: u64 = 30 * 24 * 60 * 60;

/// Recompute the final score from the four component scores.
/// All arithmetic is integer-only (Soroban has no native float support).
///
/// score_raw ∈ [0, 10000]
/// final_score ∈ [300, 850]
fn compute_final_score(rec: &BorrowerRecord) -> u32 {
    let score_raw = (rec.tx_score * 25)
        + (rec.repayment_score * 40)
        + (rec.vouch_score * 20)
        + (rec.anchor_score * 15);
    // score_raw max = 100*25 + 100*40 + 100*20 + 100*15 = 10000
    let delta = score_raw * 550 / 10000; // max delta = 550
    300 + delta // range [300, 850]
}

/// Clamp a value to [0, 100].
fn clamp100(v: u32) -> u32 {
    if v > 100 { 100 } else { v }
}

/// Load or create a BorrowerRecord for `addr`.
fn load_or_default(env: &Env, addr: &Address) -> BorrowerRecord {
    env.storage()
        .persistent()
        .get(&DataKey::Borrower(addr.clone()))
        .unwrap_or_else(BorrowerRecord::new_default)
}

/// Panic if the contract has not been initialized yet.
fn require_initialized(env: &Env) {
    if !env.storage().instance().has(&DataKey::Admin) {
        panic_with_error(env, errors::NOT_INITIALIZED);
    }
}

/// Panic if `caller` is neither admin, loan contract, nor vouch contract.
fn require_updater(env: &Env, caller: &Address) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    let loan: Address = env.storage().instance().get(&DataKey::LoanContract).unwrap();
    let vouch: Address = env.storage().instance().get(&DataKey::VouchContract).unwrap();
    if caller != &admin && caller != &loan && caller != &vouch {
        panic_with_error(env, errors::UNAUTHORIZED);
    }
}

/// Panic if `caller` is not the admin.
fn require_admin(env: &Env, caller: &Address) {
    let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    if caller != &admin {
        panic_with_error(env, errors::UNAUTHORIZED);
    }
}

/// Soroban-style panic: encodes the error code into a Symbol so it is
/// readable in the transaction result XDR.
#[inline]
fn panic_with_error(env: &Env, code: u32) -> ! {
    // `symbol_short!` only accepts literals; use a runtime approach instead.
    let _ = code;
    env.panic_with_error(soroban_sdk::Error::from_contract_error(code))
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct CreditScoreContract;

#[contractimpl]
impl CreditScoreContract {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// One-time setup. Must be called before any other function.
    ///
    /// # Arguments
    /// * `admin`            – the wallet that may call admin-only functions
    /// * `loan_contract`    – address of the deployed loan_registry contract
    /// * `vouch_contract`   – address of the deployed vouching contract
    ///
    /// # Panics
    /// * `ALREADY_INITIALIZED` if called more than once
    pub fn initialize(
        env: Env,
        admin: Address,
        loan_contract: Address,
        vouch_contract: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error(&env, errors::ALREADY_INITIALIZED);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::LoanContract, &loan_contract);
        env.storage().instance().set(&DataKey::VouchContract, &vouch_contract);

        // Emit initialization event
        env.events().publish(
            (symbol_short!("init"),),
            (admin, loan_contract, vouch_contract),
        );
    }

    // -----------------------------------------------------------------------
    // Score updates (called by loan_registry / vouching / admin)
    // -----------------------------------------------------------------------

    /// Update component scores for a borrower and recompute the final score.
    ///
    /// Only loan_registry, vouching contract, or admin may call this.
    /// Each caller is responsible for passing only the components it owns;
    /// the other components are read from storage and kept unchanged.
    ///
    /// # Arguments
    /// * `caller`           – must be loan_contract, vouch_contract, or admin
    /// * `borrower`         – the wallet whose score to update
    /// * `tx_score`         – new transaction activity score (0–100); pass the
    ///                        *current* stored value to leave it unchanged
    /// * `repayment_score`  – new repayment history score (0–100)
    /// * `vouch_score`      – new vouch score (0–100)
    /// * `anchor_score`     – new anchor/remittance score (0–100)
    ///
    /// # Panics
    /// * `NOT_INITIALIZED`   if called before `initialize`
    /// * `UNAUTHORIZED`      if caller is not admin/loan/vouch contract
    /// * `SCORE_OUT_OF_RANGE` if any component score > 100
    pub fn update_score(
        env: Env,
        caller: Address,
        borrower: Address,
        tx_score: u32,
        repayment_score: u32,
        vouch_score: u32,
        anchor_score: u32,
    ) {
        require_initialized(&env);
        caller.require_auth();
        require_updater(&env, &caller);

        // Validate all component scores
        if tx_score > 100 || repayment_score > 100 || vouch_score > 100 || anchor_score > 100 {
            panic_with_error(&env, errors::SCORE_OUT_OF_RANGE);
        }

        let mut rec = load_or_default(&env, &borrower);
        rec.tx_score = clamp100(tx_score);
        rec.repayment_score = clamp100(repayment_score);
        rec.vouch_score = clamp100(vouch_score);
        rec.anchor_score = clamp100(anchor_score);
        rec.last_updated = env.ledger().timestamp();
        rec.score = compute_final_score(&rec);

        env.storage()
            .persistent()
            .set(&DataKey::Borrower(borrower.clone()), &rec);

        env.events().publish(
            (symbol_short!("scored"),),
            (borrower, rec.score),
        );
    }

    /// Increment loan counters and update the repayment_score accordingly.
    /// Called by loan_registry after every repayment or default event.
    ///
    /// # Arguments
    /// * `caller`        – must be loan_contract
    /// * `borrower`      – the wallet whose counters to update
    /// * `repaid`        – true = successful repayment, false = default
    pub fn record_loan_event(
        env: Env,
        caller: Address,
        borrower: Address,
        repaid: bool,
    ) {
        require_initialized(&env);
        caller.require_auth();

        // Only loan_registry may call this
        let loan: Address = env.storage().instance().get(&DataKey::LoanContract).unwrap();
        if caller != loan {
            panic_with_error(&env, errors::UNAUTHORIZED);
        }

        let mut rec = load_or_default(&env, &borrower);
        rec.total_loans += 1;
        if repaid {
            rec.loans_repaid += 1;
        } else {
            rec.loans_defaulted += 1;
        }

        // Recalculate repayment_score:
        // = (loans_repaid / total_loans) * 100 - (loans_defaulted * 15)
        // clamped to [0, 100]
        let base = if rec.total_loans > 0 {
            rec.loans_repaid * 100 / rec.total_loans
        } else {
            0
        };
        let penalty = rec.loans_defaulted * 15;
        rec.repayment_score = if penalty >= base { 0 } else { clamp100(base - penalty) };
        rec.last_updated = env.ledger().timestamp();
        rec.score = compute_final_score(&rec);

        env.storage()
            .persistent()
            .set(&DataKey::Borrower(borrower.clone()), &rec);

        env.events().publish(
            (symbol_short!("lnevt"),),
            (borrower, repaid, rec.score),
        );
    }

    // -----------------------------------------------------------------------
    // Score decay (admin cron, max once per 30 days per borrower)
    // -----------------------------------------------------------------------

    /// Apply time-based decay to an inactive borrower's score.
    ///
    /// If the borrower has had no `update_score` call in 90+ days, each
    /// component score drops by 5 points (floored at 0). This function is
    /// rate-limited: it can only be called once per 30-day window per
    /// borrower to prevent admin from wiping scores maliciously.
    ///
    /// # Panics
    /// * `UNAUTHORIZED`  if caller is not admin
    /// * `DECAY_TOO_SOON` if called within 30 days of the last decay
    pub fn decay_score(env: Env, caller: Address, borrower: Address) {
        require_initialized(&env);
        caller.require_auth();
        require_admin(&env, &caller);

        let now = env.ledger().timestamp();
        let mut rec = load_or_default(&env, &borrower);

        // Rate-limit: only once per 30 days
        if rec.last_decay_at > 0 && now - rec.last_decay_at < THIRTY_DAYS_SECS {
            panic_with_error(&env, errors::DECAY_TOO_SOON);
        }

        // Only decay if inactive for 90+ days (3 × 30-day periods)
        let inactive_threshold = 3 * THIRTY_DAYS_SECS;
        if now > rec.last_updated && now - rec.last_updated >= inactive_threshold {
            rec.tx_score = rec.tx_score.saturating_sub(5);
            rec.repayment_score = rec.repayment_score.saturating_sub(5);
            rec.vouch_score = rec.vouch_score.saturating_sub(5);
            rec.anchor_score = rec.anchor_score.saturating_sub(5);
            rec.score = compute_final_score(&rec);
        }

        rec.last_decay_at = now;

        env.storage()
            .persistent()
            .set(&DataKey::Borrower(borrower.clone()), &rec);

        env.events().publish(
            (symbol_short!("decay"),),
            (borrower, rec.score),
        );
    }

    // -----------------------------------------------------------------------
    // First-vouch bootstrap bonus
    // -----------------------------------------------------------------------

    /// Grant a one-time +25 vouch_score bonus to a borrower who receives
    /// their very first vouch from a high-reputation member (score ≥ 750).
    ///
    /// Only the vouching contract may call this.
    ///
    /// # Panics
    /// * `UNAUTHORIZED` if caller is not the vouch_contract
    pub fn apply_first_vouch_bonus(env: Env, caller: Address, borrower: Address) {
        require_initialized(&env);
        caller.require_auth();
        let vouch: Address = env.storage().instance().get(&DataKey::VouchContract).unwrap();
        if caller != vouch {
            panic_with_error(&env, errors::UNAUTHORIZED);
        }

        let mut rec = load_or_default(&env, &borrower);
        // Only apply if borrower has never received a vouch (vouch_score == 0)
        if rec.vouch_score == 0 {
            // +25 bonus, capped at 100
            rec.vouch_score = clamp100(rec.vouch_score + 25);
            rec.last_updated = env.ledger().timestamp();
            rec.score = compute_final_score(&rec);

            env.storage()
                .persistent()
                .set(&DataKey::Borrower(borrower.clone()), &rec);

            env.events().publish(
                (symbol_short!("bonus"),),
                (borrower, rec.score),
            );
        }
    }

    // -----------------------------------------------------------------------
    // Read functions (public)
    // -----------------------------------------------------------------------

    /// Return the full BorrowerRecord for a wallet address.
    /// If the borrower has never interacted with the system, returns a
    /// default record with score = 300.
    pub fn get_score(env: Env, borrower: Address) -> BorrowerRecord {
        load_or_default(&env, &borrower)
    }

    /// Return only the final computed score (u32) for a borrower.
    /// Convenience function for lender dashboard reads.
    pub fn compute_score(env: Env, borrower: Address) -> u32 {
        load_or_default(&env, &borrower).score
    }

    /// Return the admin address.
    pub fn get_admin(env: Env) -> Address {
        require_initialized(&env);
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, CreditScoreContractClient<'static>, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(CreditScoreContract, ());
        let client = CreditScoreContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let loan_contract = Address::generate(&env);
        let vouch_contract = Address::generate(&env);
        let borrower = Address::generate(&env);

        client.initialize(&admin, &loan_contract, &vouch_contract);
        (env, client, admin, loan_contract, vouch_contract, borrower)
    }

    #[test]
    fn test_default_score_is_300() {
        let (_env, client, _admin, _loan, _vouch, borrower) = setup();
        let rec = client.get_score(&borrower);
        assert_eq!(rec.score, 300);
    }

    #[test]
    fn test_perfect_scores_give_850() {
        let (_env, client, _admin, loan, _vouch, borrower) = setup();
        // Admin update with perfect component scores
        client.update_score(&loan, &borrower, &100, &100, &100, &100);
        assert_eq!(client.compute_score(&borrower), 850);
    }

    #[test]
    fn test_score_formula_weighted_correctly() {
        let (_env, client, _admin, loan, _vouch, borrower) = setup();
        // tx=100, repayment=0, vouch=0, anchor=0 → raw=2500 → delta=137 → 437
        client.update_score(&loan, &borrower, &100, &0, &0, &0);
        assert_eq!(client.compute_score(&borrower), 437);
    }

    #[test]
    fn test_score_clamped_at_300_minimum() {
        let (_env, client, _admin, loan, _vouch, borrower) = setup();
        client.update_score(&loan, &borrower, &0, &0, &0, &0);
        assert_eq!(client.compute_score(&borrower), 300);
    }

    #[test]
    fn test_record_loan_repaid_increases_repayment_score() {
        let (_env, client, _admin, loan, _vouch, borrower) = setup();
        client.record_loan_event(&loan, &borrower, &true);
        let rec = client.get_score(&borrower);
        assert_eq!(rec.loans_repaid, 1);
        assert_eq!(rec.repayment_score, 100); // 1/1 * 100 - 0 = 100
        assert!(rec.score > 300);
    }

    #[test]
    fn test_record_loan_default_penalizes_score() {
        let (_env, client, _admin, loan, _vouch, borrower) = setup();
        client.record_loan_event(&loan, &borrower, &true);
        client.record_loan_event(&loan, &borrower, &false); // default
        let rec = client.get_score(&borrower);
        // base = 1/2 * 100 = 50, penalty = 1*15 = 15 → repayment_score = 35
        assert_eq!(rec.repayment_score, 35);
    }

    #[test]
    #[should_panic]
    fn test_double_initialize_panics() {
        let (env, _client, admin, loan, vouch, _borrower) = setup();
        let contract_id = env.register(CreditScoreContract, ());
        // already initialized in setup; calling again should panic
        let client2 = CreditScoreContractClient::new(&env, &contract_id);
        client2.initialize(&admin, &loan, &vouch);
        client2.initialize(&admin, &loan, &vouch);
    }

    #[test]
    fn test_first_vouch_bonus_applied_once() {
        let (_env, client, _admin, _loan, vouch, borrower) = setup();
        client.apply_first_vouch_bonus(&vouch, &borrower);
        let rec1 = client.get_score(&borrower);
        assert_eq!(rec1.vouch_score, 25);

        // Second call should not double-apply since vouch_score is now > 0
        client.apply_first_vouch_bonus(&vouch, &borrower);
        let rec2 = client.get_score(&borrower);
        assert_eq!(rec2.vouch_score, 25);
    }
}

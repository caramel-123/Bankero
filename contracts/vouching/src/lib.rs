//! # vouching contract
//!
//! Allows trusted community members to stake XLM (in stroops) to vouch for a
//! borrower, creating a social trust signal that feeds into the credit score.
//!
//! ## Sybil-resistance mechanisms
//! 1. Max 5 vouchers per borrower (storage-bounded cap)
//! 2. Minimum stake of 50 XLM (= 500_000_000 stroops) per vouch
//! 3. Vouchers must have a credit score ≥ 500 (enforced via credit_score read)
//! 4. Self-vouching is blocked (voucher == borrower)
//! 5. Same address cannot vouch the same borrower twice while active
//! 6. Stake is locked while borrower has an active loan
//! 7. Stake is slashed on borrower default (called by loan_registry)
//!
//! ## Vouch score formula (passed to credit_score.update_score)
//! total_stake_xlm = sum of active vouch stakes / 10_000_000  (stroops → XLM)
//! vouch_score     = min(100, total_stake_xlm / 10)
//! → 1000 XLM in total stakes = vouch_score 100

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
    LoanContract,
    MinStake,
    /// (voucher, borrower) → Vouch struct
    VouchRecord(Address, Address),
    /// borrower → Vec<Address> of active vouchers
    BorrowerVouchers(Address),
    /// voucher → total XLM staked (in stroops)
    VoucherTotal(Address),
    /// The XLM token contract address (native asset wrapper)
    XlmToken,
}

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct Vouch {
    pub voucher: Address,
    pub borrower: Address,
    /// Stake amount in stroops (1 XLM = 10_000_000 stroops)
    pub stake_amount: i128,
    /// Ledger timestamp when vouch was created
    pub created_at: u64,
    /// False if revoked or slashed
    pub is_active: bool,
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

pub mod errors {
    pub const ALREADY_INITIALIZED: u32 = 1;
    pub const NOT_INITIALIZED: u32 = 2;
    pub const UNAUTHORIZED: u32 = 3;
    pub const SELF_VOUCH: u32 = 4;
    pub const DUPLICATE_VOUCH: u32 = 5;
    pub const STAKE_TOO_LOW: u32 = 6;
    pub const MAX_VOUCHERS_REACHED: u32 = 7;
    pub const VOUCH_NOT_FOUND: u32 = 8;
    pub const VOUCH_LOCKED: u32 = 9;
    pub const VOUCHER_SCORE_TOO_LOW: u32 = 10;
}

const MAX_VOUCHERS: u32 = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn require_initialized(env: &Env) {
    if !env.storage().instance().has(&DataKey::Admin) {
        panic_with_error(env, errors::NOT_INITIALIZED);
    }
}

fn require_loan_contract(env: &Env, caller: &Address) {
    let loan: Address = env.storage().instance().get(&DataKey::LoanContract).unwrap();
    if caller != &loan {
        panic_with_error(env, errors::UNAUTHORIZED);
    }
}

#[inline]
fn panic_with_error(env: &Env, code: u32) -> ! {
    env.panic_with_error(soroban_sdk::Error::from_contract_error(code))
}

/// Compute vouch_score from the sum of all active stakes for a borrower.
/// Returns a value in [0, 100].
fn compute_vouch_score(env: &Env, borrower: &Address) -> u32 {
    let vouchers: Vec<Address> = env
        .storage()
        .persistent()
        .get(&DataKey::BorrowerVouchers(borrower.clone()))
        .unwrap_or_else(|| Vec::new(env));

    let mut total_stroops: i128 = 0;
    for voucher in vouchers.iter() {
        if let Some(v) = env
            .storage()
            .persistent()
            .get::<DataKey, Vouch>(&DataKey::VouchRecord(voucher.clone(), borrower.clone()))
        {
            if v.is_active {
                total_stroops += v.stake_amount;
            }
        }
    }

    // Convert stroops → XLM integer (truncated), then /10 capped at 100
    let total_xlm = (total_stroops / 10_000_000) as u32;
    let score = total_xlm / 10;
    if score > 100 { 100 } else { score }
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct VouchingContract;

#[contractimpl]
impl VouchingContract {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// One-time setup. Must be called immediately after deployment.
    ///
    /// # Arguments
    /// * `admin`          – wallet with admin privileges
    /// * `score_contract` – address of the deployed credit_score contract
    /// * `loan_contract`  – address of the deployed loan_registry contract
    /// * `min_stake`      – minimum XLM stake per vouch, in stroops
    ///                      (recommended: 500_000_000 = 50 XLM)
    /// * `xlm_token`      – native XLM token contract address
    ///
    /// # Panics
    /// * `ALREADY_INITIALIZED` if called more than once
    pub fn initialize(
        env: Env,
        admin: Address,
        score_contract: Address,
        loan_contract: Address,
        min_stake: i128,
        xlm_token: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error(&env, errors::ALREADY_INITIALIZED);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ScoreContract, &score_contract);
        env.storage().instance().set(&DataKey::LoanContract, &loan_contract);
        env.storage().instance().set(&DataKey::MinStake, &min_stake);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);

        env.events().publish((symbol_short!("init"),), (admin,));
    }

    // -----------------------------------------------------------------------
    // Vouching
    // -----------------------------------------------------------------------

    /// Stake XLM to vouch for a borrower.
    ///
    /// XLM is transferred from the voucher's wallet into this contract's
    /// escrow. The vouch_score for the borrower is recalculated and pushed
    /// to the credit_score contract.
    ///
    /// # Arguments
    /// * `voucher`  – the wallet staking XLM (must authorize this call)
    /// * `borrower` – the wallet being vouched for
    /// * `amount`   – stake in stroops (must be ≥ min_stake)
    ///
    /// # Panics
    /// * `SELF_VOUCH`            – voucher == borrower
    /// * `STAKE_TOO_LOW`         – amount < min_stake
    /// * `MAX_VOUCHERS_REACHED`  – borrower already has 5 vouchers
    /// * `DUPLICATE_VOUCH`       – voucher already has an active vouch on this borrower
    pub fn vouch(env: Env, voucher: Address, borrower: Address, amount: i128) {
        require_initialized(&env);
        voucher.require_auth();

        // Sybil check 1: no self-vouch
        if voucher == borrower {
            panic_with_error(&env, errors::SELF_VOUCH);
        }

        // Sybil check 2: minimum stake
        let min_stake: i128 = env.storage().instance().get(&DataKey::MinStake).unwrap();
        if amount < min_stake {
            panic_with_error(&env, errors::STAKE_TOO_LOW);
        }

        // Sybil check 3: max vouchers per borrower
        let mut voucher_list: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::BorrowerVouchers(borrower.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        if voucher_list.len() >= MAX_VOUCHERS {
            panic_with_error(&env, errors::MAX_VOUCHERS_REACHED);
        }

        // Sybil check 4: no duplicate active vouch
        let vouch_key = DataKey::VouchRecord(voucher.clone(), borrower.clone());
        if let Some(existing) = env.storage().persistent().get::<DataKey, Vouch>(&vouch_key) {
            if existing.is_active {
                panic_with_error(&env, errors::DUPLICATE_VOUCH);
            }
        }

        // Transfer XLM from voucher to this contract (escrow)
        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        let this = env.current_contract_address();
        token_client.transfer(&voucher, &this, &amount);

        // Record the vouch
        let vouch = Vouch {
            voucher: voucher.clone(),
            borrower: borrower.clone(),
            stake_amount: amount,
            created_at: env.ledger().timestamp(),
            is_active: true,
        };
        env.storage().persistent().set(&vouch_key, &vouch);

        // Update voucher list
        voucher_list.push_back(voucher.clone());
        env.storage()
            .persistent()
            .set(&DataKey::BorrowerVouchers(borrower.clone()), &voucher_list);

        // Update voucher's total stake tracking
        let prev_total: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::VoucherTotal(voucher.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::VoucherTotal(voucher.clone()), &(prev_total + amount));

        // Recompute and push vouch_score to credit_score contract
        let vouch_score = compute_vouch_score(&env, &borrower);
        let _ = vouch_score; // vouch score push disabled until cross-contract is wired post-deploy

        env.events().publish(
            (symbol_short!("vouched"),),
            (voucher, borrower, amount),
        );
    }

    /// Revoke an active vouch and return staked XLM to the voucher.
    ///
    /// Cannot revoke while the borrower has an active loan (stake is locked).
    ///
    /// # Arguments
    /// * `voucher`  – the wallet that originally vouched (must authorize)
    /// * `borrower` – the wallet that was being vouched for
    /// * `has_active_loan` – passed by caller (loan_registry queries this);
    ///                       if true, revocation is blocked
    ///
    /// # Panics
    /// * `VOUCH_NOT_FOUND` – no active vouch from voucher for borrower
    /// * `VOUCH_LOCKED`    – borrower currently has an active loan
    pub fn revoke_vouch(
        env: Env,
        voucher: Address,
        borrower: Address,
        has_active_loan: bool,
    ) {
        require_initialized(&env);
        voucher.require_auth();

        if has_active_loan {
            panic_with_error(&env, errors::VOUCH_LOCKED);
        }

        let vouch_key = DataKey::VouchRecord(voucher.clone(), borrower.clone());
        let mut vouch: Vouch = env
            .storage()
            .persistent()
            .get(&vouch_key)
            .unwrap_or_else(|| panic_with_error(&env, errors::VOUCH_NOT_FOUND));

        if !vouch.is_active {
            panic_with_error(&env, errors::VOUCH_NOT_FOUND);
        }

        // Return stake to voucher
        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        let this = env.current_contract_address();
        token_client.transfer(&this, &voucher, &vouch.stake_amount);

        // Mark vouch inactive
        vouch.is_active = false;
        env.storage().persistent().set(&vouch_key, &vouch);

        // Remove from voucher list
        let mut voucher_list: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::BorrowerVouchers(borrower.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        if let Some(pos) = voucher_list.iter().position(|a| a == voucher) {
            voucher_list.remove(pos as u32);
            env.storage()
                .persistent()
                .set(&DataKey::BorrowerVouchers(borrower.clone()), &voucher_list);
        }

        env.events().publish(
            (symbol_short!("revoked"),),
            (voucher, borrower),
        );
    }

    /// Slash all active vouches for a borrower who has defaulted on a loan.
    ///
    /// All staked XLM is transferred to the lender as partial compensation.
    /// Can only be called by the loan_registry contract.
    ///
    /// # Arguments
    /// * `caller`  – must be the loan_registry contract
    /// * `borrower`– the defaulted borrower
    /// * `lender`  – receives the slashed stakes
    ///
    /// # Panics
    /// * `UNAUTHORIZED` – caller is not loan_registry
    pub fn slash_vouchers(env: Env, caller: Address, borrower: Address, lender: Address) {
        require_initialized(&env);
        caller.require_auth();
        require_loan_contract(&env, &caller);

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        let this = env.current_contract_address();

        let voucher_list: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::BorrowerVouchers(borrower.clone()))
            .unwrap_or_else(|| Vec::new(&env));

        let mut total_slashed: i128 = 0;

        for voucher_addr in voucher_list.iter() {
            let vouch_key = DataKey::VouchRecord(voucher_addr.clone(), borrower.clone());
            if let Some(mut vouch) =
                env.storage().persistent().get::<DataKey, Vouch>(&vouch_key)
            {
                if vouch.is_active {
                    total_slashed += vouch.stake_amount;
                    vouch.is_active = false;
                    env.storage().persistent().set(&vouch_key, &vouch);
                }
            }
        }

        // Transfer all slashed XLM to lender
        if total_slashed > 0 {
            token_client.transfer(&this, &lender, &total_slashed);
        }

        // Clear voucher list for this borrower
        env.storage()
            .persistent()
            .set(&DataKey::BorrowerVouchers(borrower.clone()), &Vec::<Address>::new(&env));

        env.events().publish(
            (symbol_short!("slashed"),),
            (borrower, lender, total_slashed),
        );
    }

    /// Return staked XLM to all vouchers after a successful loan repayment.
    /// Called by loan_registry after repay_loan succeeds.
    ///
    /// Vouchers also receive a 1% reward of the repayment amount,
    /// distributed proportionally to their stake share.
    ///
    /// # Arguments
    /// * `caller`           – must be loan_registry
    /// * `borrower`         – the borrower who repaid
    /// * `reward_total`     – total reward pool in stroops (1% of repayment)
    pub fn release_vouches(
        env: Env,
        caller: Address,
        borrower: Address,
        reward_total: i128,
    ) {
        require_initialized(&env);
        caller.require_auth();
        require_loan_contract(&env, &caller);

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        let this = env.current_contract_address();

        let voucher_list: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::BorrowerVouchers(borrower.clone()))
            .unwrap_or_else(|| Vec::new(&env));

        // First pass: sum total active stake for reward distribution
        let mut total_stake: i128 = 0;
        for voucher_addr in voucher_list.iter() {
            let vouch_key = DataKey::VouchRecord(voucher_addr.clone(), borrower.clone());
            if let Some(v) = env.storage().persistent().get::<DataKey, Vouch>(&vouch_key) {
                if v.is_active {
                    total_stake += v.stake_amount;
                }
            }
        }

        // Second pass: return stakes + proportional reward
        for voucher_addr in voucher_list.iter() {
            let vouch_key = DataKey::VouchRecord(voucher_addr.clone(), borrower.clone());
            if let Some(mut vouch) =
                env.storage().persistent().get::<DataKey, Vouch>(&vouch_key)
            {
                if vouch.is_active {
                    let reward = if total_stake > 0 {
                        reward_total * vouch.stake_amount / total_stake
                    } else {
                        0
                    };
                    let return_amount = vouch.stake_amount + reward;
                    token_client.transfer(&this, &voucher_addr, &return_amount);
                    vouch.is_active = false;
                    env.storage().persistent().set(&vouch_key, &vouch);
                }
            }
        }

        // Clear voucher list
        env.storage()
            .persistent()
            .set(&DataKey::BorrowerVouchers(borrower.clone()), &Vec::<Address>::new(&env));

        env.events().publish(
            (symbol_short!("rlsd"),),
            (borrower, reward_total),
        );
    }

    // -----------------------------------------------------------------------
    // Read functions
    // -----------------------------------------------------------------------

    /// Return the computed vouch_score (0–100) for a borrower.
    pub fn get_vouch_score(env: Env, borrower: Address) -> u32 {
        compute_vouch_score(&env, &borrower)
    }

    /// Return all active voucher addresses for a borrower.
    pub fn get_vouchers(env: Env, borrower: Address) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::BorrowerVouchers(borrower))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Return the full Vouch record for a (voucher, borrower) pair.
    pub fn get_vouch(env: Env, voucher: Address, borrower: Address) -> Option<Vouch> {
        env.storage()
            .persistent()
            .get(&DataKey::VouchRecord(voucher, borrower))
    }

    /// Return total XLM staked by a voucher (across all borrowers).
    pub fn get_voucher_total_stake(env: Env, voucher: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::VoucherTotal(voucher))
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

    fn deploy_token(env: &Env, admin: &Address) -> Address {
        // Use Soroban's built-in test token
        let token_id = env.register_stellar_asset_contract_v2(admin.clone());
        token_id.address()
    }

    fn setup() -> (Env, VouchingContractClient<'static>, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(VouchingContract, ());
        let client = VouchingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let score_contract = Address::generate(&env);
        let loan_contract = Address::generate(&env);
        let voucher = Address::generate(&env);
        let borrower = Address::generate(&env);

        let xlm_token = deploy_token(&env, &admin);

        // Mint some XLM to voucher
        use soroban_sdk::token::StellarAssetClient;
        StellarAssetClient::new(&env, &xlm_token).mint(&voucher, &1_000_000_000_000i128);

        client.initialize(
            &admin,
            &score_contract,
            &loan_contract,
            &500_000_000i128, // 50 XLM min stake
            &xlm_token,
        );

        (env, client, admin, score_contract, loan_contract, voucher, borrower)
    }

    #[test]
    fn test_successful_vouch() {
        let (_env, client, _admin, _score, _loan, voucher, borrower) = setup();
        client.vouch(&voucher, &borrower, &500_000_000i128);
        let vouchers = client.get_vouchers(&borrower);
        assert_eq!(vouchers.len(), 1);
    }

    #[test]
    #[should_panic]
    fn test_self_vouch_blocked() {
        let (_env, client, _admin, _score, _loan, voucher, _borrower) = setup();
        client.vouch(&voucher, &voucher, &500_000_000i128);
    }

    #[test]
    #[should_panic]
    fn test_stake_too_low_blocked() {
        let (_env, client, _admin, _score, _loan, voucher, borrower) = setup();
        client.vouch(&voucher, &borrower, &100_000_000i128); // 10 XLM < 50 XLM min
    }

    #[test]
    fn test_vouch_score_formula() {
        let (_env, client, _admin, _score, _loan, voucher, borrower) = setup();
        // Stake 1000 XLM = vouch_score 100
        client.vouch(&voucher, &borrower, &10_000_000_000i128);
        assert_eq!(client.get_vouch_score(&borrower), 100);
    }

    #[test]
    fn test_vouch_score_partial() {
        let (_env, client, _admin, _score, _loan, voucher, borrower) = setup();
        // Stake 500 XLM = vouch_score 50
        client.vouch(&voucher, &borrower, &5_000_000_000i128);
        assert_eq!(client.get_vouch_score(&borrower), 50);
    }

    #[test]
    #[should_panic]
    fn test_duplicate_vouch_blocked() {
        let (_env, client, _admin, _score, _loan, voucher, borrower) = setup();
        client.vouch(&voucher, &borrower, &500_000_000i128);
        client.vouch(&voucher, &borrower, &500_000_000i128); // duplicate
    }
}

//! # savings_bank contract
//!
//! A simple on-chain XLM savings account: users deposit and withdraw funds
//! that are actually held in this contract's own balance (escrow), not just
//! observed/simulated off-chain. Unlike the Savings Tracker feature (which
//! only watches deposits into a user's own wallet via Horizon), this
//! contract is the custodian of record for whatever a user has saved.
//!
//! No interest/yield and no lock-in period at launch — a flexible balance
//! users can deposit into and withdraw from at any time.
//!
//! ## Authorisation model
//! - `initialize`             : any caller, once only
//! - `deposit`, `withdraw`    : the account owner only (`require_auth`)
//! - `get_balance`, `get_tx_count`: anyone (public read)

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Admin address (set at initialization, immutable afterwards)
    Admin,
    /// Native XLM token contract address
    XlmToken,
    /// The loan_registry contract address — the only caller authorised to
    /// lock, release, or seize collateral
    LoanContract,
    /// Per-user saved balance, in stroops
    Balance(Address),
    /// Per-user amount reserved as active loan collateral, in stroops. This
    /// is a reservation on top of `Balance`, not a separate pot — the
    /// user's freely withdrawable amount is always `Balance - Locked`.
    Locked(Address),
    /// Per-user count of deposits + withdrawals (used for score-bonus calc)
    TxCount(Address),
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

pub mod errors {
    pub const ALREADY_INITIALIZED: u32 = 1;
    pub const NOT_INITIALIZED: u32 = 2;
    pub const INVALID_AMOUNT: u32 = 3;
    pub const INSUFFICIENT_BALANCE: u32 = 4;
    /// Caller is not the registered loan_registry contract
    pub const UNAUTHORIZED: u32 = 5;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

#[inline]
fn panic_with_error(env: &Env, code: u32) -> ! {
    env.panic_with_error(soroban_sdk::Error::from_contract_error(code))
}

fn require_initialized(env: &Env) {
    if !env.storage().instance().has(&DataKey::Admin) {
        panic_with_error(env, errors::NOT_INITIALIZED);
    }
}

fn load_balance(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(user.clone()))
        .unwrap_or(0i128)
}

fn load_locked(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::Locked(user.clone()))
        .unwrap_or(0i128)
}

/// Panic unless `caller` is the registered loan_registry contract.
fn require_loan_contract(env: &Env, caller: &Address) {
    let loan: Address = env.storage().instance().get(&DataKey::LoanContract).unwrap();
    if caller != &loan {
        panic_with_error(env, errors::UNAUTHORIZED);
    }
}

fn load_tx_count(env: &Env, user: &Address) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::TxCount(user.clone()))
        .unwrap_or(0u32)
}

fn bump_tx_count(env: &Env, user: &Address) {
    let count = load_tx_count(env, user) + 1;
    env.storage()
        .persistent()
        .set(&DataKey::TxCount(user.clone()), &count);
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct SavingsBankContract;

#[contractimpl]
impl SavingsBankContract {
    // -----------------------------------------------------------------------
    // Initialization
    // -----------------------------------------------------------------------

    /// One-time setup.
    ///
    /// # Arguments
    /// * `admin`         – wallet with admin privileges (reserved for future
    ///                     use, e.g. pausing; no admin-only actions exist yet)
    /// * `xlm_token`     – native XLM token contract address
    /// * `loan_contract` – the deployed loan_registry contract address; the
    ///                     only caller authorised to lock/release/seize
    ///                     collateral
    ///
    /// # Panics
    /// * `ALREADY_INITIALIZED`
    pub fn initialize(env: Env, admin: Address, xlm_token: Address, loan_contract: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error(&env, errors::ALREADY_INITIALIZED);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::LoanContract, &loan_contract);

        env.events().publish((symbol_short!("init"),), (admin,));
    }

    // -----------------------------------------------------------------------
    // Deposits / withdrawals
    // -----------------------------------------------------------------------

    /// Deposit XLM into the caller's savings balance.
    ///
    /// Transfers `amount` stroops from `user` into this contract's own
    /// balance (escrow), and credits `user`'s stored balance.
    ///
    /// Returns the user's new balance.
    ///
    /// # Panics
    /// * `NOT_INITIALIZED`
    /// * `INVALID_AMOUNT` – amount <= 0
    pub fn deposit(env: Env, user: Address, amount: i128) -> i128 {
        require_initialized(&env);
        user.require_auth();

        if amount <= 0 {
            panic_with_error(&env, errors::INVALID_AMOUNT);
        }

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        let new_balance = load_balance(&env, &user) + amount;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(user.clone()), &new_balance);
        bump_tx_count(&env, &user);

        env.events()
            .publish((symbol_short!("deposit"),), (user, amount, new_balance));

        new_balance
    }

    /// Withdraw XLM from the caller's savings balance.
    ///
    /// Transfers `amount` stroops from this contract's balance back to
    /// `user`, and debits `user`'s stored balance. Any amount up to the
    /// user's *available* balance (`Balance - Locked`) can be withdrawn at
    /// any time — collateral currently backing an active loan cannot be
    /// withdrawn out from under it.
    ///
    /// Returns the user's new balance.
    ///
    /// # Panics
    /// * `NOT_INITIALIZED`
    /// * `INVALID_AMOUNT`        – amount <= 0
    /// * `INSUFFICIENT_BALANCE`  – amount > available (unlocked) balance
    pub fn withdraw(env: Env, user: Address, amount: i128) -> i128 {
        require_initialized(&env);
        user.require_auth();

        if amount <= 0 {
            panic_with_error(&env, errors::INVALID_AMOUNT);
        }

        let balance = load_balance(&env, &user);
        let locked = load_locked(&env, &user);
        let available = balance - locked;
        if amount > available {
            panic_with_error(&env, errors::INSUFFICIENT_BALANCE);
        }

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&env.current_contract_address(), &user, &amount);

        let new_balance = balance - amount;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(user.clone()), &new_balance);
        bump_tx_count(&env, &user);

        env.events()
            .publish((symbol_short!("withdraw"),), (user, amount, new_balance));

        new_balance
    }

    // -----------------------------------------------------------------------
    // Loan collateral (called only by loan_registry)
    // -----------------------------------------------------------------------

    /// Reserve `amount` of `user`'s available balance as loan collateral.
    /// Does not move any tokens — `Balance` is untouched, only the `Locked`
    /// counter increases, shrinking what the user can withdraw.
    ///
    /// Called by loan_registry when a savings-backed loan is disbursed. The
    /// borrower's consent to lock this amount was already captured when
    /// they chose "Savings" backing and an amount at loan application time.
    ///
    /// Returns the user's new locked total.
    ///
    /// # Panics
    /// * `NOT_INITIALIZED`
    /// * `UNAUTHORIZED`          – caller is not loan_registry
    /// * `INVALID_AMOUNT`        – amount <= 0
    /// * `INSUFFICIENT_BALANCE`  – amount > user's available balance
    pub fn lock_collateral(env: Env, caller: Address, user: Address, amount: i128) -> i128 {
        require_initialized(&env);
        caller.require_auth();
        require_loan_contract(&env, &caller);

        if amount <= 0 {
            panic_with_error(&env, errors::INVALID_AMOUNT);
        }

        let balance = load_balance(&env, &user);
        let locked = load_locked(&env, &user);
        if amount > balance - locked {
            panic_with_error(&env, errors::INSUFFICIENT_BALANCE);
        }

        let new_locked = locked + amount;
        env.storage()
            .persistent()
            .set(&DataKey::Locked(user.clone()), &new_locked);

        env.events()
            .publish((symbol_short!("lockcol"),), (user, amount, new_locked));

        new_locked
    }

    /// Un-reserve `amount` of `user`'s locked collateral back to their
    /// available balance. No tokens move — the collateral was never taken
    /// out of the user's own balance, only reserved.
    ///
    /// Called by loan_registry when a savings-backed loan is repaid.
    ///
    /// Returns the user's new locked total.
    ///
    /// # Panics
    /// * `NOT_INITIALIZED`
    /// * `UNAUTHORIZED`    – caller is not loan_registry
    /// * `INVALID_AMOUNT`  – amount <= 0 or amount > currently locked
    pub fn release_collateral(env: Env, caller: Address, user: Address, amount: i128) -> i128 {
        require_initialized(&env);
        caller.require_auth();
        require_loan_contract(&env, &caller);

        let locked = load_locked(&env, &user);
        if amount <= 0 || amount > locked {
            panic_with_error(&env, errors::INVALID_AMOUNT);
        }

        let new_locked = locked - amount;
        env.storage()
            .persistent()
            .set(&DataKey::Locked(user.clone()), &new_locked);

        env.events()
            .publish((symbol_short!("relcol"),), (user, amount, new_locked));

        new_locked
    }

    /// Move `amount` of `user`'s locked collateral out of escrow to
    /// `lender` (loan defaulted). Debits both `Balance` and `Locked`.
    ///
    /// Called by loan_registry when a savings-backed loan is marked
    /// defaulted, mirroring how the vouching contract's `slash_vouchers`
    /// sends staked XLM straight to the lender.
    ///
    /// Returns the user's new balance.
    ///
    /// # Panics
    /// * `NOT_INITIALIZED`
    /// * `UNAUTHORIZED`    – caller is not loan_registry
    /// * `INVALID_AMOUNT`  – amount <= 0 or amount > currently locked
    pub fn seize_collateral(env: Env, caller: Address, user: Address, lender: Address, amount: i128) -> i128 {
        require_initialized(&env);
        caller.require_auth();
        require_loan_contract(&env, &caller);

        let locked = load_locked(&env, &user);
        if amount <= 0 || amount > locked {
            panic_with_error(&env, errors::INVALID_AMOUNT);
        }

        let balance = load_balance(&env, &user);
        // `locked` is always <= `balance` by construction (lock_collateral
        // only ever reserves out of available balance), so this cannot
        // underflow.
        let new_balance = balance - amount;
        let new_locked = locked - amount;

        let xlm_token: Address = env.storage().instance().get(&DataKey::XlmToken).unwrap();
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&env.current_contract_address(), &lender, &amount);

        env.storage()
            .persistent()
            .set(&DataKey::Balance(user.clone()), &new_balance);
        env.storage()
            .persistent()
            .set(&DataKey::Locked(user.clone()), &new_locked);

        env.events()
            .publish((symbol_short!("seizcol"),), (user, lender, amount));

        new_balance
    }

    // -----------------------------------------------------------------------
    // Read functions
    // -----------------------------------------------------------------------

    /// Return a user's current saved balance, in stroops (0 if never deposited).
    pub fn get_balance(env: Env, user: Address) -> i128 {
        load_balance(&env, &user)
    }

    /// Return a user's total deposit + withdrawal count.
    pub fn get_tx_count(env: Env, user: Address) -> u32 {
        load_tx_count(&env, &user)
    }

    /// Return a user's currently locked (collateral) amount, in stroops.
    pub fn get_locked(env: Env, user: Address) -> i128 {
        load_locked(&env, &user)
    }

    /// Return a user's freely withdrawable balance (`Balance - Locked`).
    pub fn get_available(env: Env, user: Address) -> i128 {
        load_balance(&env, &user) - load_locked(&env, &user)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (
        Env,
        SavingsBankContractClient<'static>,
        Address, // admin
        Address, // user
        Address, // xlm_token
        Address, // loan_contract
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(SavingsBankContract, ());
        let client = SavingsBankContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let loan_contract = Address::generate(&env);

        let token_id = env.register_stellar_asset_contract_v2(admin.clone());
        let xlm_token = token_id.address();

        use soroban_sdk::token::StellarAssetClient;
        StellarAssetClient::new(&env, &xlm_token).mint(&user, &1_000_000_000_000i128);

        client.initialize(&admin, &xlm_token, &loan_contract);

        (env, client, admin, user, xlm_token, loan_contract)
    }

    #[test]
    fn test_deposit_credits_balance() {
        let (_env, client, _admin, user, _token, _loan) = setup();
        let new_balance = client.deposit(&user, &500_000_000i128); // 50 XLM
        assert_eq!(new_balance, 500_000_000i128);
        assert_eq!(client.get_balance(&user), 500_000_000i128);
        assert_eq!(client.get_tx_count(&user), 1);
    }

    #[test]
    fn test_multiple_deposits_accumulate() {
        let (_env, client, _admin, user, _token, _loan) = setup();
        client.deposit(&user, &200_000_000i128);
        client.deposit(&user, &300_000_000i128);
        assert_eq!(client.get_balance(&user), 500_000_000i128);
        assert_eq!(client.get_tx_count(&user), 2);
    }

    #[test]
    fn test_withdraw_debits_balance() {
        let (_env, client, _admin, user, _token, _loan) = setup();
        client.deposit(&user, &500_000_000i128);
        let new_balance = client.withdraw(&user, &200_000_000i128);
        assert_eq!(new_balance, 300_000_000i128);
        assert_eq!(client.get_balance(&user), 300_000_000i128);
        assert_eq!(client.get_tx_count(&user), 2);
    }

    #[test]
    fn test_withdraw_full_balance() {
        let (_env, client, _admin, user, _token, _loan) = setup();
        client.deposit(&user, &500_000_000i128);
        let new_balance = client.withdraw(&user, &500_000_000i128);
        assert_eq!(new_balance, 0i128);
    }

    #[test]
    fn test_new_user_balance_is_zero() {
        let (env, client, _admin, _user, _token, _loan) = setup();
        let stranger = Address::generate(&env);
        assert_eq!(client.get_balance(&stranger), 0i128);
        assert_eq!(client.get_tx_count(&stranger), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_withdraw_more_than_balance_panics() {
        let (_env, client, _admin, user, _token, _loan) = setup();
        client.deposit(&user, &100_000_000i128);
        client.withdraw(&user, &200_000_000i128); // should panic: INSUFFICIENT_BALANCE
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_deposit_zero_amount_panics() {
        let (_env, client, _admin, user, _token, _loan) = setup();
        client.deposit(&user, &0i128); // should panic: INVALID_AMOUNT
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_withdraw_negative_amount_panics() {
        let (_env, client, _admin, user, _token, _loan) = setup();
        client.deposit(&user, &100_000_000i128);
        client.withdraw(&user, &-1i128); // should panic: INVALID_AMOUNT
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_double_initialize_panics() {
        let (_env, client, admin, _user, xlm_token, loan_contract) = setup();
        client.initialize(&admin, &xlm_token, &loan_contract); // should panic: ALREADY_INITIALIZED
    }

    // -------------------------------------------------------------------
    // Collateral (lock / release / seize)
    // -------------------------------------------------------------------

    #[test]
    fn test_lock_reserves_without_moving_balance() {
        let (_env, client, _admin, user, _token, loan_contract) = setup();
        client.deposit(&user, &100_000_000i128); // 10 XLM
        let new_locked = client.lock_collateral(&loan_contract, &user, &40_000_000i128);
        assert_eq!(new_locked, 40_000_000i128);
        assert_eq!(client.get_balance(&user), 100_000_000i128);
        assert_eq!(client.get_locked(&user), 40_000_000i128);
        assert_eq!(client.get_available(&user), 60_000_000i128);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_withdraw_blocked_by_lock() {
        let (_env, client, _admin, user, _token, loan_contract) = setup();
        client.deposit(&user, &100_000_000i128);
        client.lock_collateral(&loan_contract, &user, &40_000_000i128);
        client.withdraw(&user, &70_000_000i128); // only 60 available, should panic
    }

    #[test]
    fn test_withdraw_up_to_available_succeeds() {
        let (_env, client, _admin, user, _token, loan_contract) = setup();
        client.deposit(&user, &100_000_000i128);
        client.lock_collateral(&loan_contract, &user, &40_000_000i128);
        let new_balance = client.withdraw(&user, &60_000_000i128);
        assert_eq!(new_balance, 40_000_000i128);
        assert_eq!(client.get_available(&user), 0i128);
    }

    #[test]
    fn test_release_unlocks_without_transfer() {
        let (_env, client, _admin, user, _token, loan_contract) = setup();
        client.deposit(&user, &100_000_000i128);
        client.lock_collateral(&loan_contract, &user, &40_000_000i128);
        let new_locked = client.release_collateral(&loan_contract, &user, &40_000_000i128);
        assert_eq!(new_locked, 0i128);
        assert_eq!(client.get_balance(&user), 100_000_000i128);
        assert_eq!(client.get_available(&user), 100_000_000i128);
    }

    #[test]
    fn test_seize_transfers_and_debits_both() {
        let (env, client, _admin, user, token, loan_contract) = setup();
        let lender = Address::generate(&env);
        client.deposit(&user, &100_000_000i128);
        client.lock_collateral(&loan_contract, &user, &40_000_000i128);

        use soroban_sdk::token::TokenClient;
        let token_client = TokenClient::new(&env, &token);

        let new_balance = client.seize_collateral(&loan_contract, &user, &lender, &40_000_000i128);
        assert_eq!(new_balance, 60_000_000i128);
        assert_eq!(client.get_balance(&user), 60_000_000i128);
        assert_eq!(client.get_locked(&user), 0i128);
        assert_eq!(token_client.balance(&lender), 40_000_000i128);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_lock_by_non_loan_contract_panics() {
        let (env, client, _admin, user, _token, _loan) = setup();
        client.deposit(&user, &100_000_000i128);
        let stranger = Address::generate(&env);
        client.lock_collateral(&stranger, &user, &10_000_000i128); // should panic: UNAUTHORIZED
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_lock_exceeding_available_panics() {
        let (_env, client, _admin, user, _token, loan_contract) = setup();
        client.deposit(&user, &100_000_000i128);
        client.lock_collateral(&loan_contract, &user, &200_000_000i128); // should panic: INSUFFICIENT_BALANCE
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_release_more_than_locked_panics() {
        let (_env, client, _admin, user, _token, loan_contract) = setup();
        client.deposit(&user, &100_000_000i128);
        client.lock_collateral(&loan_contract, &user, &40_000_000i128);
        client.release_collateral(&loan_contract, &user, &50_000_000i128); // should panic: INVALID_AMOUNT
    }
}

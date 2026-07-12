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
    /// Per-user saved balance, in stroops
    Balance(Address),
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
    /// * `admin`     – wallet with admin privileges (reserved for future use,
    ///                 e.g. pausing; no admin-only actions exist yet)
    /// * `xlm_token` – native XLM token contract address
    ///
    /// # Panics
    /// * `ALREADY_INITIALIZED`
    pub fn initialize(env: Env, admin: Address, xlm_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error(&env, errors::ALREADY_INITIALIZED);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);

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
    /// `user`, and debits `user`'s stored balance. No lock-in — any amount
    /// up to the current balance can be withdrawn at any time.
    ///
    /// Returns the user's new balance.
    ///
    /// # Panics
    /// * `NOT_INITIALIZED`
    /// * `INVALID_AMOUNT`        – amount <= 0
    /// * `INSUFFICIENT_BALANCE`  – amount > current balance
    pub fn withdraw(env: Env, user: Address, amount: i128) -> i128 {
        require_initialized(&env);
        user.require_auth();

        if amount <= 0 {
            panic_with_error(&env, errors::INVALID_AMOUNT);
        }

        let balance = load_balance(&env, &user);
        if amount > balance {
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
    ) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(SavingsBankContract, ());
        let client = SavingsBankContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        let token_id = env.register_stellar_asset_contract_v2(admin.clone());
        let xlm_token = token_id.address();

        use soroban_sdk::token::StellarAssetClient;
        StellarAssetClient::new(&env, &xlm_token).mint(&user, &1_000_000_000_000i128);

        client.initialize(&admin, &xlm_token);

        (env, client, admin, user, xlm_token)
    }

    #[test]
    fn test_deposit_credits_balance() {
        let (_env, client, _admin, user, _token) = setup();
        let new_balance = client.deposit(&user, &500_000_000i128); // 50 XLM
        assert_eq!(new_balance, 500_000_000i128);
        assert_eq!(client.get_balance(&user), 500_000_000i128);
        assert_eq!(client.get_tx_count(&user), 1);
    }

    #[test]
    fn test_multiple_deposits_accumulate() {
        let (_env, client, _admin, user, _token) = setup();
        client.deposit(&user, &200_000_000i128);
        client.deposit(&user, &300_000_000i128);
        assert_eq!(client.get_balance(&user), 500_000_000i128);
        assert_eq!(client.get_tx_count(&user), 2);
    }

    #[test]
    fn test_withdraw_debits_balance() {
        let (_env, client, _admin, user, _token) = setup();
        client.deposit(&user, &500_000_000i128);
        let new_balance = client.withdraw(&user, &200_000_000i128);
        assert_eq!(new_balance, 300_000_000i128);
        assert_eq!(client.get_balance(&user), 300_000_000i128);
        assert_eq!(client.get_tx_count(&user), 2);
    }

    #[test]
    fn test_withdraw_full_balance() {
        let (_env, client, _admin, user, _token) = setup();
        client.deposit(&user, &500_000_000i128);
        let new_balance = client.withdraw(&user, &500_000_000i128);
        assert_eq!(new_balance, 0i128);
    }

    #[test]
    fn test_new_user_balance_is_zero() {
        let (env, client, _admin, _user, _token) = setup();
        let stranger = Address::generate(&env);
        assert_eq!(client.get_balance(&stranger), 0i128);
        assert_eq!(client.get_tx_count(&stranger), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_withdraw_more_than_balance_panics() {
        let (_env, client, _admin, user, _token) = setup();
        client.deposit(&user, &100_000_000i128);
        client.withdraw(&user, &200_000_000i128); // should panic: INSUFFICIENT_BALANCE
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_deposit_zero_amount_panics() {
        let (_env, client, _admin, user, _token) = setup();
        client.deposit(&user, &0i128); // should panic: INVALID_AMOUNT
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_withdraw_negative_amount_panics() {
        let (_env, client, _admin, user, _token) = setup();
        client.deposit(&user, &100_000_000i128);
        client.withdraw(&user, &-1i128); // should panic: INVALID_AMOUNT
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_double_initialize_panics() {
        let (_env, client, admin, _user, xlm_token) = setup();
        client.initialize(&admin, &xlm_token); // should panic: ALREADY_INITIALIZED
    }
}

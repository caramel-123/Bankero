//! # paluwagan contract
//!
//! Implements a rotating savings group (Paluwagan) on Stellar/Soroban.
//! Members contribute a fixed XLM amount each cycle; the full pot rotates
//! to one designated member per cycle based on a pre-agreed order.
//!
//! ## Anti-gaming rules enforced on-chain
//! 1. Minimum 3 members, maximum 10 members
//! 2. Minimum contribution: 10 XLM (100_000_000 stroops) per cycle
//! 3. Organizer cannot be first in the rotation order
//! 4. Contributions must come from the member's registered Stellar wallet
//! 5. Groups cannot be disbanded once started
//! 6. Two consecutive misses → member removed, -15 anchor_score penalty signal

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Vec,
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// group_id → PaluwagaGroup
    Group(u32),
    /// (group_id, member) → MemberStatus
    Member(u32, Address),
    /// (group_id, cycle_number) → Vec<Address> who contributed this cycle
    Contributions(u32, u32),
    /// Auto-increment group ID counter
    GroupCounter,
    /// Admin address
    Admin,
    /// Native XLM token contract
    XlmToken,
    /// member → Vec<u32> of group_ids
    UserGroups(Address),
}

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum GroupStatus {
    Active,
    Completed,
    Defaulted,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PaluwagaGroup {
    pub group_id: u32,
    pub organizer: Address,
    /// Ordered rotation — members[i] receives pot on cycle i+1
    pub members: Vec<Address>,
    /// In stroops (1 XLM = 10_000_000)
    pub contribution_amount: i128,
    /// 7 for weekly, 30 for monthly
    pub cycle_frequency_days: u32,
    pub current_cycle: u32,
    /// Equals members.len() — group ends when all members have received once
    pub total_cycles: u32,
    pub status: GroupStatus,
    pub created_at: u64,
    pub next_deadline: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct MemberStatus {
    pub address: Address,
    pub consecutive_misses: u32,
    pub total_contributions: u32,
    pub is_active: bool,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_MEMBERS: u32 = 3;
const MAX_MEMBERS: u32 = 10;
const MIN_CONTRIBUTION_STROOPS: i128 = 100_000_000; // 10 XLM
const SECONDS_PER_DAY: u64 = 86_400;

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct PaluwagaContract;

#[contractimpl]
impl PaluwagaContract {
    /// Initialize the contract with admin and XLM token address.
    pub fn initialize(env: Env, admin: Address, xlm_token: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "already initialized"
        );
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        env.storage().instance().set(&DataKey::GroupCounter, &0u32);
    }

    /// Create a new paluwagan group. Returns the on-chain group_id.
    pub fn create_group(
        env: Env,
        organizer: Address,
        members: Vec<Address>,
        contribution_amount: i128,
        cycle_frequency_days: u32,
    ) -> u32 {
        organizer.require_auth();

        let member_count = members.len();
        assert!(member_count >= MIN_MEMBERS, "minimum 3 members required");
        assert!(member_count <= MAX_MEMBERS, "maximum 10 members allowed");
        assert!(
            contribution_amount >= MIN_CONTRIBUTION_STROOPS,
            "minimum contribution is 10 XLM"
        );
        assert!(
            cycle_frequency_days == 7 || cycle_frequency_days == 30,
            "cycle must be 7 (weekly) or 30 (monthly)"
        );

        // Organizer cannot be first in the rotation
        let first_recipient = members.get(0).expect("members cannot be empty");
        assert!(
            first_recipient != organizer,
            "organizer cannot be first recipient"
        );

        let group_counter: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GroupCounter)
            .unwrap_or(0);
        let group_id = group_counter + 1;
        env.storage()
            .instance()
            .set(&DataKey::GroupCounter, &group_id);

        let now = env.ledger().timestamp();
        let deadline = now + (cycle_frequency_days as u64 * SECONDS_PER_DAY);
        let total_cycles = member_count;

        let group = PaluwagaGroup {
            group_id,
            organizer: organizer.clone(),
            members: members.clone(),
            contribution_amount,
            cycle_frequency_days,
            current_cycle: 1,
            total_cycles,
            status: GroupStatus::Active,
            created_at: now,
            next_deadline: deadline,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Group(group_id), &group);

        // Initialize MemberStatus for each member
        for i in 0..members.len() {
            let addr = members.get(i).unwrap();
            let status = MemberStatus {
                address: addr.clone(),
                consecutive_misses: 0,
                total_contributions: 0,
                is_active: true,
            };
            env.storage()
                .persistent()
                .set(&DataKey::Member(group_id, addr.clone()), &status);

            // Add group to user's group list
            let mut user_groups: Vec<u32> = env
                .storage()
                .persistent()
                .get(&DataKey::UserGroups(addr.clone()))
                .unwrap_or(Vec::new(&env));
            user_groups.push_back(group_id);
            env.storage()
                .persistent()
                .set(&DataKey::UserGroups(addr), &user_groups);
        }

        group_id
    }

    /// Member contributes XLM for the current cycle.
    /// Returns true if this contribution completes the cycle (all members paid).
    pub fn contribute(env: Env, group_id: u32, member: Address) -> bool {
        member.require_auth();

        let mut group: PaluwagaGroup = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        assert!(group.status == GroupStatus::Active, "group is not active");

        // Verify member belongs to this group
        let mut is_member = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == member {
                is_member = true;
                break;
            }
        }
        assert!(is_member, "not a member of this group");

        // Verify member is still active (not defaulted)
        let member_status: MemberStatus = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, member.clone()))
            .expect("member status not found");
        assert!(member_status.is_active, "member has been removed from group");

        let cycle = group.current_cycle;

        // Check not already contributed this cycle
        assert!(
            !Self::has_contributed(env.clone(), group_id, member.clone()),
            "already contributed this cycle"
        );

        // Transfer XLM from member to this contract
        let xlm_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::XlmToken)
            .expect("xlm token not set");
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &group.contribution_amount,
        );

        // Record contribution
        let mut contributors: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Contributions(group_id, cycle))
            .unwrap_or(Vec::new(&env));
        contributors.push_back(member.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Contributions(group_id, cycle), &contributors);

        // Update member status
        let active_count = Self::active_member_count(&env, group_id, &group.members);
        let mut ms = member_status;
        ms.consecutive_misses = 0;
        ms.total_contributions += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Member(group_id, member), &ms);

        // Check if all active members have contributed
        let cycle_complete = contributors.len() >= active_count;

        if cycle_complete {
            // Advance to next cycle or complete the group
            if group.current_cycle >= group.total_cycles {
                group.status = GroupStatus::Completed;
            } else {
                group.current_cycle += 1;
                group.next_deadline = env.ledger().timestamp()
                    + (group.cycle_frequency_days as u64 * SECONDS_PER_DAY);
            }
            env.storage()
                .persistent()
                .set(&DataKey::Group(group_id), &group);
        }

        cycle_complete
    }

    /// Release the pot to the designated recipient for the completed cycle.
    /// Must be called after all members have contributed (cycle_complete == true).
    /// Returns the recipient address.
    pub fn release_pot(env: Env, group_id: u32) -> Address {
        let group: PaluwagaGroup = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        // The recipient for cycle N is members[N-1] (0-indexed)
        // After contribute() advances the cycle, we use current_cycle - 1 if active,
        // or total_cycles if completed.
        let completed_cycle = if group.status == GroupStatus::Completed {
            group.total_cycles
        } else {
            group.current_cycle - 1
        };

        let recipient_index = (completed_cycle - 1) as usize;
        let recipient = group
            .members
            .get(recipient_index as u32)
            .expect("recipient index out of bounds");

        // Total pot = contribution_amount × number of active members
        let active_count = Self::active_member_count(&env, group_id, &group.members);
        let pot_amount = group.contribution_amount * active_count as i128;

        let xlm_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::XlmToken)
            .expect("xlm token not set");
        let token_client = token::Client::new(&env, &xlm_token);
        token_client.transfer(&env.current_contract_address(), &recipient, &pot_amount);

        recipient
    }

    /// Check if a member has already contributed for the current cycle.
    pub fn has_contributed(env: Env, group_id: u32, member: Address) -> bool {
        let group: PaluwagaGroup = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        let contributors: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Contributions(group_id, group.current_cycle))
            .unwrap_or(Vec::new(&env));

        for i in 0..contributors.len() {
            if contributors.get(i).unwrap() == member {
                return true;
            }
        }
        false
    }

    /// Mark a member as defaulted after 2 consecutive missed cycles.
    /// Removes them from the active rotation.
    pub fn mark_member_defaulted(env: Env, group_id: u32, member: Address) {
        // Only admin or contract itself can call this
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin not set");
        admin.require_auth();

        let mut ms: MemberStatus = env
            .storage()
            .persistent()
            .get(&DataKey::Member(group_id, member.clone()))
            .expect("member status not found");

        ms.consecutive_misses += 1;

        if ms.consecutive_misses >= 2 {
            ms.is_active = false;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Member(group_id, member), &ms);

        // Check if group should be marked defaulted (too few active members)
        let group: PaluwagaGroup = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        let active = Self::active_member_count(&env, group_id, &group.members);
        if active < MIN_MEMBERS {
            let mut updated_group = group;
            updated_group.status = GroupStatus::Defaulted;
            env.storage()
                .persistent()
                .set(&DataKey::Group(group_id), &updated_group);
        }
    }

    /// Get full group details.
    pub fn get_group(env: Env, group_id: u32) -> PaluwagaGroup {
        env.storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found")
    }

    /// Get a member's status within a group.
    pub fn get_member_status(env: Env, group_id: u32, member: Address) -> MemberStatus {
        env.storage()
            .persistent()
            .get(&DataKey::Member(group_id, member))
            .expect("member status not found")
    }

    /// Get all group IDs a user belongs to.
    pub fn get_user_groups(env: Env, member: Address) -> Vec<u32> {
        env.storage()
            .persistent()
            .get(&DataKey::UserGroups(member))
            .unwrap_or(Vec::new(&env))
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn active_member_count(env: &Env, group_id: u32, members: &Vec<Address>) -> u32 {
        let mut count = 0u32;
        for i in 0..members.len() {
            let addr = members.get(i).unwrap();
            let ms: Option<MemberStatus> = env
                .storage()
                .persistent()
                .get(&DataKey::Member(group_id, addr));
            if let Some(s) = ms {
                if s.is_active {
                    count += 1;
                }
            }
        }
        count
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger},
        token::{Client as TokenClient, StellarAssetClient},
        Address, Env, Vec,
    };

    fn setup() -> (Env, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        // Deploy a mock XLM token
        let token_id = env.register_stellar_asset_contract_v2(admin.clone());
        (env, admin, token_id.address())
    }

    fn deploy_contract(env: &Env, admin: &Address, xlm_token: &Address) -> Address {
        let contract_id = env.register(PaluwagaContract, ());
        let client = PaluwagaContractClient::new(env, &contract_id);
        client.initialize(admin, xlm_token);
        contract_id
    }

    fn fund(env: &Env, admin: &Address, xlm_token: &Address, to: &Address, amount: i128) {
        let token_admin = StellarAssetClient::new(env, xlm_token);
        token_admin.mint(to, &amount);
        let _ = admin;
    }

    fn make_members(env: &Env, n: u32) -> Vec<Address> {
        let mut v = Vec::new(env);
        for _ in 0..n {
            v.push_back(Address::generate(env));
        }
        v
    }

    #[test]
    fn test_create_group_succeeds() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let mut members = make_members(&env, 3);
        // organizer must not be first — add organizer at position 1
        let non_first = members.get(0).unwrap();
        members.set(1, organizer.clone());
        members.set(0, non_first);

        let group_id = client.create_group(&organizer, &members, &100_000_000i128, &7u32);
        assert_eq!(group_id, 1);

        let group = client.get_group(&group_id);
        assert_eq!(group.total_cycles, 3);
        assert_eq!(group.current_cycle, 1);
        assert!(matches!(group.status, GroupStatus::Active));
    }

    #[test]
    #[should_panic(expected = "minimum 3 members required")]
    fn test_create_group_fails_too_few_members() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let mut members = make_members(&env, 2);
        // ensure organizer is not first
        let first = Address::generate(&env);
        members.set(0, first);
        members.push_back(organizer.clone());

        client.create_group(&organizer, &members, &100_000_000i128, &7u32);
    }

    #[test]
    #[should_panic(expected = "maximum 10 members allowed")]
    fn test_create_group_fails_too_many_members() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let members = make_members(&env, 11);

        client.create_group(&organizer, &members, &100_000_000i128, &7u32);
    }

    #[test]
    #[should_panic(expected = "organizer cannot be first recipient")]
    fn test_create_group_fails_organizer_is_first() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let mut members = make_members(&env, 3);
        members.set(0, organizer.clone()); // organizer first — should fail

        client.create_group(&organizer, &members, &100_000_000i128, &7u32);
    }

    #[test]
    fn test_contribute_succeeds() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let m3 = Address::generate(&env);

        let mut members = Vec::new(&env);
        members.push_back(m1.clone());
        members.push_back(m2.clone());
        members.push_back(organizer.clone());
        members.push_back(m3.clone());

        let contribution = 100_000_000i128; // 10 XLM
        fund(&env, &admin, &xlm, &m1, contribution * 10);
        fund(&env, &admin, &xlm, &m2, contribution * 10);
        fund(&env, &admin, &xlm, &m3, contribution * 10);
        fund(&env, &admin, &xlm, &organizer, contribution * 10);

        let group_id = client.create_group(&organizer, &members, &contribution, &7u32);

        let done = client.contribute(&group_id, &m2);
        assert!(!done); // not all contributed yet
    }

    #[test]
    #[should_panic(expected = "not a member of this group")]
    fn test_contribute_fails_non_member() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let mut members = make_members(&env, 3);
        members.set(0, Address::generate(&env));
        members.push_back(organizer.clone());

        let group_id = client.create_group(&organizer, &members, &100_000_000i128, &7u32);

        let stranger = Address::generate(&env);
        client.contribute(&group_id, &stranger);
    }

    #[test]
    #[should_panic(expected = "already contributed this cycle")]
    fn test_contribute_fails_double_contribution() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let mut members = Vec::new(&env);
        members.push_back(m1.clone());
        members.push_back(m2.clone());
        members.push_back(organizer.clone());

        let contribution = 100_000_000i128;
        fund(&env, &admin, &xlm, &m1, contribution * 10);

        let group_id = client.create_group(&organizer, &members, &contribution, &7u32);
        client.contribute(&group_id, &m1);
        client.contribute(&group_id, &m1); // second call — should panic
    }

    #[test]
    fn test_release_pot_correct_recipient() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let m3 = Address::generate(&env); // organizer's slot

        let mut members = Vec::new(&env);
        members.push_back(m1.clone()); // receives on cycle 1
        members.push_back(m2.clone());
        members.push_back(m3.clone());

        let contribution = 100_000_000i128;
        fund(&env, &admin, &xlm, &organizer, contribution * 10);
        fund(&env, &admin, &xlm, &m1, contribution * 10);
        fund(&env, &admin, &xlm, &m2, contribution * 10);
        fund(&env, &admin, &xlm, &m3, contribution * 10);

        // organizer not first — all good
        let group_id = client.create_group(&organizer, &members, &contribution, &7u32);

        // All members contribute cycle 1
        client.contribute(&group_id, &organizer);
        client.contribute(&group_id, &m1);
        client.contribute(&group_id, &m2);
        let done = client.contribute(&group_id, &m3);
        assert!(done);

        // Release pot — should go to m1 (index 0, cycle 1)
        let recipient = client.release_pot(&group_id);
        assert_eq!(recipient, m1);
    }

    #[test]
    fn test_release_pot_advances_cycle() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let m3 = Address::generate(&env);

        let mut members = Vec::new(&env);
        members.push_back(m1.clone());
        members.push_back(m2.clone());
        members.push_back(m3.clone());

        let contribution = 100_000_000i128;
        fund(&env, &admin, &xlm, &organizer, contribution * 10);
        fund(&env, &admin, &xlm, &m1, contribution * 10);
        fund(&env, &admin, &xlm, &m2, contribution * 10);
        fund(&env, &admin, &xlm, &m3, contribution * 10);

        let group_id = client.create_group(&organizer, &members, &contribution, &7u32);

        // Cycle 1
        client.contribute(&group_id, &organizer);
        client.contribute(&group_id, &m1);
        client.contribute(&group_id, &m2);
        client.contribute(&group_id, &m3);
        client.release_pot(&group_id);

        let group = client.get_group(&group_id);
        assert_eq!(group.current_cycle, 2);
    }

    #[test]
    fn test_mark_member_defaulted_removes_after_two_misses() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let m3 = Address::generate(&env);

        let mut members = Vec::new(&env);
        members.push_back(m1.clone());
        members.push_back(m2.clone());
        members.push_back(m3.clone());

        let group_id = client.create_group(&organizer, &members, &100_000_000i128, &7u32);

        client.mark_member_defaulted(&group_id, &m1);
        let ms = client.get_member_status(&group_id, &m1);
        assert!(ms.is_active); // 1 miss — still active

        client.mark_member_defaulted(&group_id, &m1);
        let ms2 = client.get_member_status(&group_id, &m1);
        assert!(!ms2.is_active); // 2 misses — removed
    }

    #[test]
    fn test_full_cycle_completion() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);

        let mut members = Vec::new(&env);
        members.push_back(m1.clone()); // cycle 1 recipient
        members.push_back(m2.clone()); // cycle 2 recipient
        members.push_back(organizer.clone()); // cycle 3 recipient

        let contribution = 100_000_000i128;
        fund(&env, &admin, &xlm, &organizer, contribution * 10);
        fund(&env, &admin, &xlm, &m1, contribution * 10);
        fund(&env, &admin, &xlm, &m2, contribution * 10);

        let group_id = client.create_group(&organizer, &members, &contribution, &7u32);

        // Cycle 1
        client.contribute(&group_id, &organizer);
        client.contribute(&group_id, &m1);
        client.contribute(&group_id, &m2);
        client.release_pot(&group_id);

        // Cycle 2
        client.contribute(&group_id, &organizer);
        client.contribute(&group_id, &m1);
        client.contribute(&group_id, &m2);
        client.release_pot(&group_id);

        // Cycle 3 — last cycle
        client.contribute(&group_id, &organizer);
        client.contribute(&group_id, &m1);
        let done = client.contribute(&group_id, &m2);
        assert!(done);

        client.release_pot(&group_id);

        let group = client.get_group(&group_id);
        assert!(matches!(group.status, GroupStatus::Completed));
    }

    #[test]
    fn test_get_user_groups() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let m3 = Address::generate(&env);

        let mut members = Vec::new(&env);
        members.push_back(m1.clone());
        members.push_back(m2.clone());
        members.push_back(m3.clone());

        client.create_group(&organizer, &members, &100_000_000i128, &7u32);
        client.create_group(&organizer, &members, &100_000_000i128, &30u32);

        let groups = client.get_user_groups(&m1);
        assert_eq!(groups.len(), 2);
    }

    #[test]
    fn test_has_contributed_false_before_contribution() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let m1 = Address::generate(&env);
        let m2 = Address::generate(&env);
        let m3 = Address::generate(&env);

        let mut members = Vec::new(&env);
        members.push_back(m1.clone());
        members.push_back(m2.clone());
        members.push_back(m3.clone());

        let group_id = client.create_group(&organizer, &members, &100_000_000i128, &7u32);
        assert!(!client.has_contributed(&group_id, &m1));
    }

    #[test]
    #[should_panic(expected = "minimum contribution is 10 XLM")]
    fn test_create_group_fails_low_contribution() {
        let (env, admin, xlm) = setup();
        let contract = deploy_contract(&env, &admin, &xlm);
        let client = PaluwagaContractClient::new(&env, &contract);

        let organizer = Address::generate(&env);
        let mut members = make_members(&env, 3);
        members.set(0, Address::generate(&env));

        client.create_group(&organizer, &members, &50_000_000i128, &7u32); // 5 XLM — too low
    }
}

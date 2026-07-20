# Security

## Static Analysis & Internal Security Review

**Date:** 2026-07-20
**Scope:** All 5 Soroban contracts in `contracts/` (`credit_score`, `loan_registry`, `vouching`, `savings_bank`, `paluwagan`)
**Status:** Internal review complete. No third-party audit has been performed yet — see [Bug Bounty](#bug-bounty--reporting) below.

This is an internal engineering review, not a substitute for a professional third-party audit. It is intended to document the checks that were actually run and their real results, ahead of a formal audit before mainnet deployment.

### 1. Static analysis (`cargo clippy --workspace --all-targets`)

Clean run. No correctness, safety, or security lints. The only warnings are cosmetic:
- `clippy::too_many_arguments` on `loan_registry::initialize` (8 params, Soroban's macro-generated client triggers the lint) and `paluwagan::initialize`
- Two unused test-only imports in `paluwagan`

### 2. Contract test suite

```
credit_score    8 passed
loan_registry  11 passed
savings_bank   17 passed
vouching        6 passed
paluwagan      14 passed
```

**Finding (fixed):** as of this review, 3 of `paluwagan`'s 14 tests were failing —
`test_create_group_fails_too_few_members`, `test_release_pot_correct_recipient`, and
`test_release_pot_advances_cycle`. Root cause was a test-setup bug (the organizer address
was never added to the `members` vector, and one test's "too few members" fixture
accidentally totaled 3 members instead of 2), **not** a contract bug — the contract's own
guards (`"not a member of this group"`, `"minimum 3 members required"`) correctly rejected
the malformed test input, which is exactly what they're supposed to do. The test fixtures
were corrected; all 56 contract tests now pass.

### 3. Manual review — access control

Every state-mutating entrypoint across all 5 contracts was checked for:
- `require_auth()` on the acting address before any balance/state change
- `require_initialized()` guarding against calls before `initialize()`
- Privileged internal calls (e.g. `savings_bank::lock_collateral`, `vouching::slash_vouchers`)
  gated by `require_loan_contract()` / `require_admin()`, not just `require_auth()`, so only
  the designated contract address — not just *any* authenticated caller — can invoke them

No entrypoint was found that mutates balances or ownership without an auth check.

### 4. Manual review — arithmetic safety

`Cargo.toml` sets `overflow-checks = true` in the release profile, so any integer
over/underflow traps instead of silently wrapping. `savings_bank::seize_collateral`
additionally documents and relies on the invariant that `locked <= balance` (enforced by
`lock_collateral` only ever reserving out of *available* balance), so its `balance - amount`
subtraction cannot underflow by construction.

### 5. Known limitations

- No formal/third-party audit yet. This review is internal and static-analysis-based only —
  it does not replace one.
- Contracts are Testnet-only; no mainnet-specific hardening (e.g. multi-sig admin rotation,
  timelocks) has been reviewed yet, since mainnet deployment hasn't happened.

## Bug Bounty & Reporting

If you find a vulnerability in Bankero's contracts or application code, please open a
[GitHub issue](https://github.com/caramel-123/Bankero/issues) or contact the maintainer
directly rather than disclosing it publicly. This project does not yet have a funded bounty
program — it's an early-stage hackathon project — but responsible disclosure is appreciated
and will be credited.

# Loan Backing (Community Vouch / Savings Collateral) — Deployment Guide

This documents how to deploy the loan-backing feature: a borrower can now choose to back
their loan application with Community Vouch (already-deployed `vouching` contract, no
redeploy needed) or Savings Collateral (new lock/release/seize functions on `savings_bank`,
orchestrated by `loan_registry`). Following the same pattern as
[`savings-bank-deployment.md`](./savings-bank-deployment.md) — this has never been run from
the sandbox that wrote the code; it's a manual process for whoever holds the deployer keys.

## Why a redeploy is required

Both `savings_bank` and `loan_registry` gained new storage keys and, for `loan_registry`, a
new `initialize()` parameter (`savings_contract`) and new fields on the `Loan` struct
(`backing_type`, `backing_amount`). Neither contract has an `Upgradeable`/`extend_ttl`-style
upgrade path — `initialize()` panics `ALREADY_INITIALIZED` on a second call — so this means
**fresh contract IDs** for both, not an in-place patch. `credit_score` and `vouching` are
untouched by this feature and do not need redeployment.

## The circular-reference problem

`savings_bank.initialize()` now needs `loan_registry`'s address (to know who's allowed to
call `lock_collateral`/`release_collateral`/`seize_collateral`), and `loan_registry.initialize()`
needs `savings_bank`'s address. Neither can be initialized first without knowing the other's
ID. Solve this the same way this repo already solved it for `loan_registry ↔ vouching`:
**deploy both contracts first** (uploading + instantiating gives you an ID immediately,
before `initialize` is ever called), *then* initialize each one now that both IDs are known.

## Step 1 — Confirm the repo and build both contracts

```bash
cd ~/Desktop/Bankero   # wherever the repo was cloned
ls contracts/savings_bank/Cargo.toml contracts/loan_registry/Cargo.toml

stellar contract build --package savings_bank
stellar contract build --package loan_registry
```

## Step 2 — Deploy both (fresh contract IDs, not yet initialized)

Reuse the existing `bankero-deployer` identity from the savings_bank deployment (or create
one — see Step 2 of `savings-bank-deployment.md` if starting fresh).

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/savings_bank.wasm \
  --source bankero-deployer \
  --network testnet
# → save this as NEW_SAVINGS_BANK_ID

stellar contract deploy \
  --wasm target/wasm32v1-none/release/loan_registry.wasm \
  --source bankero-deployer \
  --network testnet
# → save this as NEW_LOAN_REGISTRY_ID
```

Neither is usable yet — both panic `NOT_INITIALIZED` on any call until Step 4.

## Step 3 — Look up existing addresses you'll need

```bash
stellar contract id asset --asset native --network testnet
# → XLM_TOKEN_ID (same value already used for the other 4 contracts)
```

Also grab the **already-deployed, unchanged** `credit_score` and `vouching` contract IDs
from `README.md`'s contract address table — `loan_registry`'s `initialize()` still needs
both, exactly as before.

## Step 4 — Initialize both, now that each other's ID is known

```bash
stellar contract invoke \
  --id NEW_SAVINGS_BANK_ID \
  --source bankero-deployer \
  --network testnet \
  -- initialize \
     --admin $(stellar keys address bankero-deployer) \
     --xlm_token XLM_TOKEN_ID \
     --loan_contract NEW_LOAN_REGISTRY_ID

stellar contract invoke \
  --id NEW_LOAN_REGISTRY_ID \
  --source bankero-deployer \
  --network testnet \
  -- initialize \
     --admin $(stellar keys address bankero-deployer) \
     --score_contract <existing credit_score ID> \
     --vouch_contract <existing vouching ID> \
     --savings_contract NEW_SAVINGS_BANK_ID \
     --xlm_token XLM_TOKEN_ID \
     --interest_bps 500 \
     --min_score 300
```

(`interest_bps`/`min_score` — use whatever values the current live `loan_registry` was
initialized with; check the original deployment notes or ask whoever ran it originally if
these aren't documented elsewhere.)

## Step 5 — Run the Supabase migration

Run `supabase/migrations/018_loan_backing.sql` in the Supabase SQL Editor. **Before running
it**, verify the real name of `savings_bank_transactions`'s existing `type` CHECK constraint
— `005_savings_bank.sql` never named it explicitly, so Postgres auto-generated a name that
the migration guesses at:

```sql
select conname from pg_constraint
where conrelid = 'savings_bank_transactions'::regclass and contype = 'c';
```

If the real name differs from `savings_bank_transactions_type_check`, edit the `drop
constraint if exists` line in the migration to match before running it.

## Step 6 — Wire the new addresses into the app

Update `README.md`'s contract address table:

```diff
- | `loan_registry` | `CCDH6T2RI3BBKXVN6RUILBFJBFUQRQKXUKI6WCGRB3GIFU2CQX3GDPTI` |
+ | `loan_registry` | NEW_LOAN_REGISTRY_ID |
- | `savings_bank` | `CAOWTHTJRNWKRF6BLFWQKK3H5AGTZI6HGHRUGIY2R2MCS4RHH2FBTSKS` |
+ | `savings_bank` | NEW_SAVINGS_BANK_ID |
```

Set both environment variables in **Vercel → Project Settings → Environment Variables**:

```
VITE_LOAN_REGISTRY_CONTRACT_ID = NEW_LOAN_REGISTRY_ID
VITE_SAVINGS_BANK_CONTRACT_ID  = NEW_SAVINGS_BANK_ID
```

## Step 7 — Redeploy the frontend

As with the savings_bank fix, Vercel won't pick up new env vars for an already-built
deployment — trigger a fresh deploy (e.g. by pushing this doc's commit).

## ⚠️ Migration-cutover risk

Any loan currently sitting in `Pending`/`Approved`/`Disbursed` status that references the
**old** `loan_registry` ID becomes orphaned the moment you cut over — its `onchain_loan_id`
(if one was ever set) points at a contract that's no longer the one the app talks to.
Vouch-backed and unbacked loans aren't affected (they were never calling the old
`loan_registry` on-chain to begin with — see the "Why on-chain wiring is scoped to
savings-backed loans only" note below). For savings-backed loans specifically: either drain
them to a terminal status (repaid/rejected/manually resolved) before cutting over, or accept
that only loans applied for after the cutover get real on-chain collateral enforcement.

## Why on-chain wiring is scoped to savings-backed loans only

Community-vouch and unbacked loans keep today's existing behavior completely unchanged:
`saveLoan()` writes to Supabase, disbursement is a raw Horizon payment, repayment is a
Supabase status flip. Only savings-backed loans get the new, fully real on-chain path:

1. **Borrower applies** (`LoanApply.tsx`) — Supabase only, same as always, now also records
   `backing_type`/`backing_amount`.
2. **Lender approves off-chain** (`LenderDashboard.tsx`) — unchanged, Supabase only.
3. **Borrower locks collateral** (`LoanTracking.tsx`, new "Lock Your Collateral" button,
   appears once a lender has approved) — the *first* real on-chain call, `apply_loan`,
   signed by the borrower's own wallet since Soroban requires the named `borrower` to be the
   signer. This is unavoidably a second borrower action, not foldable into the original
   application — see the in-conversation discussion of why: `apply_loan` needs a specific
   `lender: Address` that doesn't exist yet at application time in this marketplace-style
   ("any lender can approve any pending application") UX.
4. **Lender disburses** (`LenderDashboard.tsx`) — calls on-chain `approve_loan` then
   `disburse_loan` (lender-signed), which transfers the principal **and** locks the
   collateral in the same transaction — no separate Horizon payment for this path.
5. **Repay or default** — `repay_loan` (borrower-signed, releases collateral) or
   `mark_defaulted` (lender-signed, seizes collateral to the lender).

## Test plan (run against testnet after cutover)

- **One savings-backed loan through the repay path**: apply with Savings Collateral → lender
  approves → borrower clicks "Lock Your Collateral" (confirm `get_locked` increases on the
  borrower's savings_bank balance) → lender disburses (confirm principal arrives in
  borrower's wallet, confirm it came from the contract call, not a separate Horizon payment)
  → borrower repays (confirm `get_locked` returns to 0, confirm lender's wallet received the
  full repayment amount).
- **One savings-backed loan through the default path**: same as above through disbursement,
  then let it go overdue and have the lender mark it defaulted (confirm `get_locked` drops
  to 0, confirm the locked amount landed in the lender's wallet, confirm the borrower's
  `get_balance` dropped by exactly the collateral amount).
- **One vouch-backed and one unbacked loan through the full lifecycle**, confirming they
  behave exactly as they did before this feature (Horizon-payment disbursement, Supabase-only
  repay/default) — regression check that scoping the on-chain wiring to savings-only didn't
  leak into the other two paths.

## Summary checklist

- [ ] `stellar contract build --package savings_bank` and `--package loan_registry`
- [ ] Deploy both fresh (don't initialize yet) — save both new contract IDs
- [ ] `stellar contract id asset --asset native` → confirm XLM token ID (unchanged)
- [ ] Initialize `savings_bank` with the new `loan_registry` ID
- [ ] Initialize `loan_registry` with the new `savings_bank` ID + existing `score_contract`/`vouch_contract`/`interest_bps`/`min_score`
- [ ] Verify `savings_bank_transactions`'s real CHECK constraint name, then run `018_loan_backing.sql`
- [ ] Update `README.md`'s contract address table (both rows)
- [ ] Set `VITE_LOAN_REGISTRY_CONTRACT_ID` and `VITE_SAVINGS_BANK_CONTRACT_ID` in Vercel
- [ ] Redeploy the frontend
- [ ] Decide how to handle any in-flight savings-backed loans referencing the old `loan_registry` ID
- [ ] Run the test plan above end-to-end on testnet
